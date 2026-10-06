import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { convertGoogleFontsMetadata } from './convert.ts';

const METADATA_URL = 'https://fonts.google.com/metadata/fonts';
const OUTPUT_FILE = resolve(
  import.meta.dirname,
  '../../../src/features/design-system/google-fonts.json',
);

async function updateFontList(): Promise<void> {
  const response = await fetch(METADATA_URL);
  if (!response.ok) {
    throw new Error(`Google Fonts metadata request failed with status ${response.status}`);
  }
  const families = convertGoogleFontsMetadata(await response.text());
  await writeFile(OUTPUT_FILE, `${JSON.stringify(families)}\n`);
  console.log(`Wrote ${families.length} font families to ${OUTPUT_FILE}`);
}

try {
  await updateFontList();
} catch (error) {
  console.error('Could not update the Google Fonts list', error);
  process.exitCode = 1;
}
