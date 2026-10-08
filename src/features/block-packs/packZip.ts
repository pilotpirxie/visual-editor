import {
  BLOCK_FILE,
  PACK_FILE,
  packBlockId,
  STYLES_FILE,
  TEMPLATE_FILE,
  THUMBNAIL_FILE,
  thumbnailBytes,
} from '../../components/packFormat';
import type { BlockJson, BlockPack, ComponentDefinition, PackInfo } from '../../components/types';
import { createZip, type ZipEntry } from '../export/zip';

function blockJsonOf(definition: ComponentDefinition): BlockJson {
  const { name, category, description, tags, fieldGroups, fields, styleOverrides } = definition;
  return { name, category, description, tags, fieldGroups, fields, styleOverrides };
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function packZip(pack: BlockPack): Promise<Blob> {
  const encoder = new TextEncoder();
  const info: PackInfo = {
    id: pack.id,
    name: pack.name,
    version: pack.version,
    author: pack.author,
    license: pack.license,
  };
  const entries: ZipEntry[] = [{ path: PACK_FILE, data: encoder.encode(jsonText(info)) }];
  for (const packBlock of pack.blocks) {
    const folder = `${packBlockId(packBlock)}/`;
    const blockJson = jsonText(blockJsonOf(packBlock.definition));
    entries.push(
      { path: `${folder}${BLOCK_FILE}`, data: encoder.encode(blockJson) },
      { path: `${folder}${TEMPLATE_FILE}`, data: encoder.encode(packBlock.template) },
      { path: `${folder}${STYLES_FILE}`, data: encoder.encode(packBlock.styles) },
      { path: `${folder}${THUMBNAIL_FILE}`, data: thumbnailBytes(packBlock.thumbnail) },
    );
  }
  return createZip(entries);
}
