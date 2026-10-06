import { readFile, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import Handlebars from 'handlebars';
import { transformWithOxc, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const KNOWN_HELPERS = {
  href: true,
  linkAttrs: true,
  svgIcon: true,
  eq: true,
  not: true,
  and: true,
  or: true,
  nl2br: true,
};

function handlebarsPrecompile(): Plugin {
  return {
    name: 'handlebars-precompile',
    transform(source, id) {
      if (!id.endsWith('.hbs')) return null;
      const spec = Handlebars.precompile(source, {
        knownHelpers: KNOWN_HELPERS,
        knownHelpersOnly: true,
        strict: false,
      });
      return {
        code: `import Handlebars from 'handlebars/runtime';\nexport default Handlebars.template(${spec});\n`,
        map: null,
      };
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
      const behaviorFiles = (await readdir(resolve(RUNTIME_DIR, 'behaviors'))).filter((file) =>
        file.endsWith('.ts'),
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

export default defineConfig({
  plugins: [react(), handlebarsPrecompile(), siteRuntime()],
  build: { outDir: 'build' },
  test: { environment: 'jsdom', css: true },
});
