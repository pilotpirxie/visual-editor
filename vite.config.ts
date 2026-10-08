import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, resolve } from 'node:path';
import Handlebars from 'handlebars';
import { transformWithOxc, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { convertIconifySet } from './packages/icon-data/src/convert.ts';
import { iconSetInfo } from './packages/icon-data/src/sets.ts';

const TEMPLATE_AST_NOISE = new Set(['loc', 'strip', 'openStrip', 'closeStrip', 'inverseStrip']);

function isTemplateAstNoise(holder: unknown, key: string): boolean {
  if (TEMPLATE_AST_NOISE.has(key)) return true;
  const isContent =
    typeof holder === 'object' &&
    holder !== null &&
    'type' in holder &&
    holder.type === 'ContentStatement';
  return isContent && key === 'original';
}

function handlebarsAst(): Plugin {
  return {
    name: 'handlebars-ast',
    transform(source, id) {
      if (!id.endsWith('.hbs')) return null;
      const ast = JSON.stringify(Handlebars.parse(source), function (key, value: unknown) {
        return isTemplateAstNoise(this, key) ? undefined : value;
      });
      return { code: `export default JSON.parse(${JSON.stringify(ast)});\n`, map: null };
    },
  };
}

const RUNTIME_ID = 'virtual:site-runtime';
const RESOLVED_RUNTIME_ID = `\0${RUNTIME_ID}`;
const RUNTIME_DIR = resolve(import.meta.dirname, 'packages/site-runtime/src');

function siteRuntime(): Plugin {
  return {
    name: 'site-runtime',
    resolveId(source) {
      return source === RUNTIME_ID ? RESOLVED_RUNTIME_ID : null;
    },
    async load(id) {
      if (id !== RESOLVED_RUNTIME_ID) return null;

      const compile = async (file: string) => {
        this.addWatchFile(file);
        const { code } = await transformWithOxc(await readFile(file, 'utf8'), file);
        return `(() => {\n${code}})();\n`;
      };

      const core = await compile(resolve(RUNTIME_DIR, 'core.ts'));
      const behaviorFiles = (await readdir(resolve(RUNTIME_DIR, 'behaviors'))).filter(
        (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
      );
      const behaviors = Object.fromEntries(
        await Promise.all(
          behaviorFiles.map(async (file) => [
            basename(file, '.ts'),
            await compile(resolve(RUNTIME_DIR, 'behaviors', file)),
          ]),
        ),
      );

      return `export const core = ${JSON.stringify(core)};\nexport const behaviors = ${JSON.stringify(behaviors)};\n`;
    },
  };
}

const ICON_SET_PREFIX = 'virtual:icon-set/';
const RESOLVED_ICON_SET_PREFIX = `\0${ICON_SET_PREFIX}`;

function iconSets(): Plugin {
  const require = createRequire(import.meta.url);
  return {
    name: 'icon-sets',
    resolveId(source) {
      if (!source.startsWith(ICON_SET_PREFIX)) return null;
      const name = source.slice(ICON_SET_PREFIX.length);
      if (iconSetInfo(name) === undefined) this.error(`Unknown icon set "${name}"`);
      return `\0${source}`;
    },
    async load(id) {
      if (!id.startsWith(RESOLVED_ICON_SET_PREFIX)) return null;
      const name = id.slice(RESOLVED_ICON_SET_PREFIX.length);
      const info = iconSetInfo(name);
      if (info === undefined) this.error(`Unknown icon set "${name}"`);
      const file = require.resolve(`${info.packageName}/icons.json`);
      const metadataFile = file.replace(/icons\.json$/, 'metadata.json');
      this.addWatchFile(file);
      let source: unknown;
      try {
        source = JSON.parse(await readFile(file, 'utf8'));
      } catch (error) {
        this.error(`Could not read icon set "${name}" from ${file}: ${String(error)}`);
      }
      let metadata: unknown = {};
      if (existsSync(metadataFile)) {
        this.addWatchFile(metadataFile);
        metadata = JSON.parse(await readFile(metadataFile, 'utf8'));
      }
      const converted = convertIconifySet(source, metadata, info.fallbackStyles);
      return `export default ${JSON.stringify(converted)};\n`;
    },
  };
}

export default defineConfig({
  plugins: [react(), handlebarsAst(), siteRuntime(), iconSets()],
  build: { outDir: 'build' },
  test: {
    environment: 'jsdom',
    css: true,
    include: ['src/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
