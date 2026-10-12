import type { Project } from '../../app/types';
import { isImageValue, isRecord } from '../../components/fields';
import type {
  PlaceholderRatio,
  PlaceholderSubject,
  UploadedImageValue,
} from '../../components/types';
import { placeholderSize } from '../../render/placeholder';
import { MAX_IMAGE_UPLOAD_BYTES, readAsDataUrl } from '../properties/ImageUploadInput';
import { AssistantError, type ImageAnswer, type Usage } from './openRouter';

export type ImageSlot = {
  holder: Record<string, unknown>;
  key: string;
  alt: string;
  ratio: PlaceholderRatio;
  subject: PlaceholderSubject;
  pageSlug: string | null;
};

export type Picture = { src: string; width: number; height: number };

export type Painter = {
  paint(prompt: string, ratio: PlaceholderRatio, signal: AbortSignal): Promise<ImageAnswer>;
  fit(dataUrl: string, ratio: PlaceholderRatio, subject: PlaceholderSubject): Promise<Picture>;
};

export type ImageProgress = { done: number; total: number };

export type SiteImages = { project: Project; made: number; failed: number; usage: Usage };

const PAINTED_SUBJECTS: readonly PlaceholderSubject[] = ['photo', 'product', 'person'];
const PAINTERS_AT_ONCE = 3;
const PERSON_EDGE_PX = 512;
const MAX_BRIEF_CHARS = 700;
const WEBP_TYPE = 'image/webp';
const JPEG_TYPE = 'image/jpeg';
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;
const STOPPING_KINDS = ['key', 'credit'];

const REQUESTED_RATIOS: Record<PlaceholderRatio, PlaceholderRatio> = {
  '1:1': '1:1',
  '4:3': '4:3',
  '3:2': '4:3',
  '16:9': '16:9',
  '3:4': '3:4',
  '21:9': '16:9',
};

const SUBJECT_STYLES: Record<PlaceholderSubject, string> = {
  photo: 'a photograph',
  product: 'a clean product photograph',
  person: 'a natural portrait photograph of one person',
  logo: 'a photograph',
  screenshot: 'a photograph',
};

function collectSlots(
  values: Record<string, unknown>,
  pageSlug: string | null,
  slots: ImageSlot[],
): void {
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isRecord(item)) collectSlots(item, pageSlug, slots);
      }
      continue;
    }
    if (!isImageValue(value) || value.source !== 'placeholder') continue;
    const { ratio, subject } = value.placeholder;
    const alt = value.alt.trim();
    if (alt === '' || !PAINTED_SUBJECTS.includes(subject)) continue;
    slots.push({ holder: values, key, alt, ratio, subject, pageSlug });
  }
}

export function imageSlots(project: Project): ImageSlot[] {
  const places: { blockIds: readonly string[]; pageSlug: string | null }[] = [
    { blockIds: project.sharedSlots.header, pageSlug: null },
  ];
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page !== undefined) places.push({ blockIds: page.blockIds, pageSlug: page.slug });
  }
  places.push({ blockIds: project.sharedSlots.footer, pageSlug: null });
  const slots: ImageSlot[] = [];
  for (const { blockIds, pageSlug } of places) {
    for (const blockId of blockIds) {
      const block = project.blocks.entities[blockId];
      if (block?.kind === 'component') collectSlots(block.values, pageSlug, slots);
    }
  }
  return slots;
}

export function imagePrompt(brief: string, slot: ImageSlot): string {
  return [
    `Create ${SUBJECT_STYLES[slot.subject]} for a website.`,
    `It shows: ${slot.alt}`,
    '',
    'About the website, for the mood and setting:',
    brief.slice(0, MAX_BRIEF_CHARS),
    '',
    'Realistic, natural light, well composed, with room around the subject so it can be cropped.',
    'No text, no letters, no logos, no watermarks, no borders.',
  ].join('\n');
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error('The image could not be encoded'));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function fitImage(
  dataUrl: string,
  ratio: PlaceholderRatio,
  subject: PlaceholderSubject,
): Promise<Picture> {
  const source = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(source);
  const full = placeholderSize(ratio);
  const aspect = full.width / full.height;
  const isWider = bitmap.width / bitmap.height > aspect;
  const cropWidth = isWider ? bitmap.height * aspect : bitmap.width;
  const cropHeight = isWider ? bitmap.height : bitmap.width / aspect;
  const longEdge = subject === 'person' ? PERSON_EDGE_PX : Math.max(full.width, full.height);
  const scale = Math.min(1, longEdge / Math.max(cropWidth, cropHeight));
  const width = Math.round(cropWidth * scale);
  const height = Math.round(cropHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    bitmap.close();
    throw new Error('This browser cannot draw the image');
  }
  const left = (bitmap.width - cropWidth) / 2;
  const top = (bitmap.height - cropHeight) / 2;
  context.drawImage(bitmap, left, top, cropWidth, cropHeight, 0, 0, width, height);
  bitmap.close();
  let encoded = await canvasBlob(canvas, WEBP_TYPE, WEBP_QUALITY);
  if (encoded.type !== WEBP_TYPE) encoded = await canvasBlob(canvas, JPEG_TYPE, JPEG_QUALITY);
  if (encoded.type !== WEBP_TYPE && encoded.type !== JPEG_TYPE) {
    throw new Error(`The image was encoded as ${encoded.type}, which cannot be stored`);
  }
  if (encoded.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(`The image is ${encoded.size} bytes, more than a project can store`);
  }
  const src = await readAsDataUrl(new File([encoded], 'image', { type: encoded.type }));
  return { src, width, height };
}

export async function withSiteImages(
  project: Project,
  brief: string,
  painter: Painter,
  signal: AbortSignal,
  onProgress: (progress: ImageProgress, site: Project, paintedPage: string | null) => void,
): Promise<SiteImages> {
  const site = structuredClone(project);
  const waiting = imageSlots(site);
  const total = waiting.length;
  let usage: Usage = { tokens: 0, cost: 0 };
  let made = 0;
  let failed = 0;
  let isStopped = false;
  onProgress({ done: 0, total }, site, null);

  async function paintSlot(slot: ImageSlot, number: number): Promise<void> {
    const requestedRatio = REQUESTED_RATIOS[slot.ratio];
    const answer = await painter.paint(imagePrompt(brief, slot), requestedRatio, signal);
    usage = { tokens: usage.tokens + answer.usage.tokens, cost: usage.cost + answer.usage.cost };
    const picture = await painter.fit(answer.dataUrl, slot.ratio, slot.subject);
    const extension = picture.src.startsWith(`data:${WEBP_TYPE}`) ? 'webp' : 'jpg';
    const image: UploadedImageValue = {
      source: 'upload',
      name: `site-image-${number}.${extension}`,
      alt: slot.alt,
      decorative: false,
      ...picture,
    };
    if (!isImageValue(image)) throw new Error('The fitted image is not a storable image');
    slot.holder[slot.key] = image;
  }

  async function paintNext(): Promise<void> {
    for (let slot = waiting.shift(); slot !== undefined; slot = waiting.shift()) {
      const number = total - waiting.length;
      if (isStopped) {
        failed += 1;
        onProgress({ done: made + failed, total }, site, null);
        continue;
      }
      let paintedPage: string | null = null;
      try {
        await paintSlot(slot, number);
        made += 1;
        paintedPage = slot.pageSlug;
      } catch (error) {
        const kind = error instanceof AssistantError ? error.kind : null;
        if (kind === 'cancelled' || signal.aborted) throw error;
        if (kind !== null && STOPPING_KINDS.includes(kind)) isStopped = true;
        console.warn(
          `Image ${number} of ${total} was not created, so it stays a placeholder`,
          error,
        );
        failed += 1;
      }
      onProgress({ done: made + failed, total }, site, paintedPage);
    }
  }

  const painters: Promise<void>[] = [];
  for (let index = 0; index < PAINTERS_AT_ONCE; index += 1) painters.push(paintNext());
  await Promise.all(painters);
  return { project: site, made, failed, usage };
}
