import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../app/types';
import { isImageValue } from '../../components/fields';
import { forEachFieldValue } from '../../components/fieldValues';
import { builtInComponents } from '../../components/registry';
import type { ImageValue } from '../../components/types';
import { parseProjectDocument } from '../../persistence/validateProject';
import { CLEAN_PRESET, withoutPresetId } from '../../presets/presets';
import { buildSiteProject } from './buildSite';
import { AssistantError } from './openRouter';
import { imagePrompt, imageSlots, withSiteImages, type Painter } from './siteImages';
import { parseSitePlan } from './siteSteps';

const HERO_ALT = 'A baker pulling loaves out of a stone oven';
const FITTED = { src: 'data:image/webp;base64,aGVsbG8=', width: 1200, height: 900 };
const BRIEF = 'Crumb & Co, a warm neighbourhood bakery in Leeds.';

const PLAN = parseSitePlan({
  title: 'Crumb & Co',
  description: 'A bakery.',
  language: 'en',
  header: 'nav-simple',
  footer: 'footer-simple',
  pages: [
    {
      name: 'Home',
      slug: 'home',
      purpose: 'Welcome',
      sections: [
        { block: 'hero-image', custom: '', theme: 'default', note: '' },
        { block: 'team-advisors', custom: '', theme: 'default', note: '' },
        { block: 'logos-cards', custom: '', theme: 'default', note: '' },
      ],
    },
    {
      name: 'Cakes',
      slug: 'cakes',
      purpose: 'Order a cake',
      sections: [
        { block: 'hero-centered', custom: '', theme: 'default', note: '' },
        { block: 'cta-image', custom: '', theme: 'default', note: '' },
      ],
    },
  ],
});

function siteProject(): Project {
  const design = withoutPresetId(structuredClone(CLEAN_PRESET.designSystem));
  return buildSiteProject(PLAN, design, {
    shared: null,
    pages: {
      home: [
        { kind: 'values', values: { image: { alt: HERO_ALT, subject: 'photo', ratio: '16:9' } } },
        { kind: 'values', values: undefined },
        { kind: 'values', values: undefined },
      ],
      cakes: null,
    },
  });
}

function imagesOf(project: Project): ImageValue[] {
  const images: ImageValue[] = [];
  for (const block of Object.values(project.blocks.entities)) {
    if (block.kind !== 'component') continue;
    const definition = builtInComponents.get(block.componentId)?.definition;
    if (definition === undefined) continue;
    forEachFieldValue(definition.fields, block.values, (_field, value) => {
      if (isImageValue(value)) images.push(value);
    });
  }
  return images;
}

function painterWith(paint: Painter['paint']): Painter {
  return { paint, fit: async () => FITTED };
}

const painted: Painter['paint'] = async () => ({
  dataUrl: 'data:image/png;base64,AAAA',
  usage: { tokens: 10, cost: 0.01 },
});

function live(): AbortSignal {
  return new AbortController().signal;
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('imageSlots', () => {
  it('lists photos, products and portraits in page order and leaves logos out', () => {
    const slots = imageSlots(siteProject());
    expect(slots[0]).toMatchObject({ alt: HERO_ALT, ratio: '16:9', subject: 'photo' });
    expect(slots.map(({ subject }) => subject)).toEqual([
      'photo',
      'person',
      'person',
      'person',
      'person',
      'product',
    ]);
  });

  it('skips an image with nothing to show', () => {
    const project = siteProject();
    for (const slot of imageSlots(project)) {
      const image = slot.holder[slot.key];
      if (isImageValue(image)) slot.holder[slot.key] = { ...image, alt: '', decorative: true };
    }
    expect(imageSlots(project)).toEqual([]);
  });
});

describe('imagePrompt', () => {
  it('says what to show, what the site is and what to leave out', () => {
    const prompt = imagePrompt(BRIEF, imageSlots(siteProject())[0]);
    expect(prompt).toContain(`It shows: ${HERO_ALT}`);
    expect(prompt).toContain(BRIEF);
    expect(prompt).toContain('No text, no letters, no logos');
  });
});

describe('withSiteImages', () => {
  it('replaces every listed placeholder and leaves the given project alone', async () => {
    const project = siteProject();
    const progress: string[] = [];
    const paint = vi.fn(painted);
    const result = await withSiteImages(project, BRIEF, painterWith(paint), live(), (step) =>
      progress.push(`${step.done}/${step.total}`),
    );
    expect(result.made).toBe(6);
    expect(result.failed).toBe(0);
    expect(result.usage.tokens).toBe(60);
    expect(result.usage.cost).toBeCloseTo(0.06);
    expect(progress[0]).toBe('0/6');
    expect(progress.at(-1)).toBe('6/6');
    expect(paint.mock.calls.map((call) => call[1])).toContain('16:9');
    const uploads = imagesOf(result.project).filter((image) => image.source === 'upload');
    expect(uploads).toHaveLength(6);
    expect(uploads[0]).toMatchObject({ ...FITTED, alt: HERO_ALT, decorative: false });
    expect(new Set(uploads.map((image) => image.source === 'upload' && image.name)).size).toBe(6);
    expect(imagesOf(project).some((image) => image.source === 'upload')).toBe(false);
    const saved: unknown = JSON.parse(JSON.stringify(result.project));
    expect(() => parseProjectDocument(saved)).not.toThrow();
  });

  it('keeps the placeholder of an image that fails and goes on', async () => {
    let calls = 0;
    const paint: Painter['paint'] = async (prompt, ratio, signal) => {
      calls += 1;
      if (calls === 2) throw new AssistantError('model', 'The model could not answer');
      return painted(prompt, ratio, signal);
    };
    const result = await withSiteImages(siteProject(), BRIEF, painterWith(paint), live(), () => {});
    expect(result.made).toBe(5);
    expect(result.failed).toBe(1);
    const images = imagesOf(result.project);
    expect(images.filter((image) => image.source === 'upload')).toHaveLength(5);
  });

  it('counts an image that cannot be fitted as failed but still paid for', async () => {
    const painter: Painter = {
      paint: painted,
      fit: async () => {
        throw new Error('The image could not be decoded');
      },
    };
    const result = await withSiteImages(siteProject(), BRIEF, painter, live(), () => {});
    expect(result.made).toBe(0);
    expect(result.failed).toBe(6);
    expect(result.usage.tokens).toBe(60);
  });

  it('stops asking once the key or the credit is refused', async () => {
    const paint = vi.fn<Painter['paint']>(async () => {
      throw new AssistantError('credit', 'Not enough credit');
    });
    const result = await withSiteImages(siteProject(), BRIEF, painterWith(paint), live(), () => {});
    expect(paint).toHaveBeenCalledTimes(3);
    expect(result.made).toBe(0);
    expect(result.failed).toBe(6);
  });

  it('gives up at once when cancelled', async () => {
    const running = new AbortController();
    const paint: Painter['paint'] = async () => {
      running.abort();
      throw new AssistantError('cancelled', 'Cancelled.');
    };
    const pending = withSiteImages(
      siteProject(),
      BRIEF,
      painterWith(paint),
      running.signal,
      () => {},
    );
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
  });

  it('does nothing on a site without images', async () => {
    const project = siteProject();
    for (const slot of imageSlots(project)) {
      const image = slot.holder[slot.key];
      if (isImageValue(image)) slot.holder[slot.key] = { ...image, alt: '', decorative: true };
    }
    const paint = vi.fn(painted);
    const result = await withSiteImages(project, BRIEF, painterWith(paint), live(), () => {});
    expect(paint).not.toHaveBeenCalled();
    expect(result).toMatchObject({ made: 0, failed: 0 });
  });
});
