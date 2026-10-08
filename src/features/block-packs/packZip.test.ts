import { describe, expect, it } from 'vitest';
import { parsePackFiles } from '../../components/packFormat';
import { packOf, quoteCardDefinition } from '../../test/packFixtures';
import { readZip } from '../export/zip';
import { packZip } from './packZip';

describe('packZip', () => {
  it('writes a pack that reads back the same', async () => {
    const pack = packOf([quoteCardDefinition()]);
    const zip = await packZip(pack);
    const files = await readZip(new Uint8Array(await zip.arrayBuffer()));
    expect([...files.keys()]).toEqual([
      'pack.json',
      'quote-card/block.json',
      'quote-card/template.hbs',
      'quote-card/styles.css',
      'quote-card/thumbnail.webp',
    ]);
    expect(parsePackFiles(files).blocks).toEqual(pack.blocks);
  });
});
