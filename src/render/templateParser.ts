export type ParseTemplate = (source: string) => hbs.AST.Program;

let parserLoad: Promise<ParseTemplate> | null = null;
let loadedParser: ParseTemplate | null = null;

async function importParser(): Promise<ParseTemplate> {
  const { parse } = await import('handlebars/dist/cjs/handlebars/compiler/base');
  loadedParser = parse;
  return parse;
}

export async function loadTemplateParser(): Promise<ParseTemplate> {
  parserLoad ??= importParser();
  try {
    return await parserLoad;
  } catch (error) {
    parserLoad = null;
    throw new Error('Could not load the template parser for custom blocks', { cause: error });
  }
}

export function loadedTemplateParser(): ParseTemplate | null {
  return loadedParser;
}
