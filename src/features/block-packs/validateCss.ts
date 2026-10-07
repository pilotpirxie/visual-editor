import type { PackError } from '../../components/packFormat';
import type { Category } from '../../components/types';

export type CssCheck = { styles: string | null; errors: PackError[] };

type CssContext = { blockId: string; rootClass: string; category: Category };

type Report = (line: number | null, message: string) => void;

const LAYER_NAME = 'components';
const NESTED_RULES = new Set([
  'CSSStyleRule',
  'CSSNestedDeclarations',
  'CSSMediaRule',
  'CSSSupportsRule',
  'CSSContainerRule',
  'CSSStartingStyleRule',
]);
const FIXED_POSITION_CATEGORIES: Category[] = ['navigations', 'banners', 'modals', 'cookies'];
const SOURCE_RULES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /@import\b/gi, message: '@import is not allowed' },
  { pattern: /!\s*important\b/gi, message: '!important is not allowed' },
  { pattern: /\\/g, message: 'escapes with \\ are not allowed' },
];
const RESOURCE_FUNCTION = /(?:-webkit-)?(?:url|image-set|src)\s*\(\s*(?<target>["']?[^"')\s]*)/gi;
const DATA_IMAGE = /^["']?data:image\//i;

function lineAt(source: string, index: number): number {
  let line = 1;
  for (const char of source.slice(0, index)) if (char === '\n') line += 1;
  return line;
}

function checkSource(source: string, report: Report): void {
  for (const { pattern, message } of SOURCE_RULES) {
    for (const match of source.matchAll(pattern)) report(lineAt(source, match.index), message);
  }
  for (const match of source.matchAll(RESOURCE_FUNCTION)) {
    const target = match.groups?.target ?? '';
    if (!DATA_IMAGE.test(target)) {
      report(lineAt(source, match.index), 'can’t load files; only data:image URLs are allowed');
    }
  }
}

function ruleType(rule: CSSRule): string {
  return rule.constructor.name;
}

function childRules(rule: CSSRule): CSSRule[] {
  if (!('cssRules' in rule)) return [];
  const { cssRules } = rule;
  return cssRules instanceof CSSRuleList ? [...cssRules] : [];
}

function checkDeclarations(rule: CSSRule, context: CssContext, report: Report): void {
  if (!('style' in rule)) return;
  const { style } = rule;
  if (!(style instanceof CSSStyleDeclaration)) return;
  for (const property of style) {
    if (style.getPropertyPriority(property) === 'important')
      report(null, '!important is not allowed');
  }
  const isFixed = style.getPropertyValue('position').trim() === 'fixed';
  if (isFixed && !FIXED_POSITION_CATEGORIES.includes(context.category)) {
    report(null, `position: fixed is only for ${FIXED_POSITION_CATEGORIES.join(', ')} blocks`);
  }
}

function checkScopedRules(rules: CSSRule[], context: CssContext, report: Report): void {
  for (const rule of rules) {
    const type = ruleType(rule);
    if (!NESTED_RULES.has(type)) {
      report(null, `${rule.cssText.split('{')[0]?.trim() ?? type} is not allowed inside the scope`);
      continue;
    }
    checkDeclarations(rule, context, report);
    checkScopedRules(childRules(rule), context, report);
  }
}

function scopeRuleOf(sheet: CSSStyleSheet, context: CssContext, report: Report): CSSRule | null {
  const shape = `@layer ${LAYER_NAME} { @scope (.${context.rootClass}) { … } }`;
  const topRules = [...sheet.cssRules].filter((rule) => ruleType(rule) !== 'CSSImportRule');
  const [layer] = topRules;
  const layerName: unknown = layer === undefined ? undefined : Reflect.get(layer, 'name');
  if (
    topRules.length !== 1 ||
    layer === undefined ||
    ruleType(layer) !== 'CSSLayerBlockRule' ||
    layerName !== LAYER_NAME
  ) {
    report(1, `must be exactly one ${shape}`);
    return null;
  }
  const [scope, ...others] = childRules(layer);
  const start: unknown = scope === undefined ? undefined : Reflect.get(scope, 'start');
  const end: unknown = scope === undefined ? undefined : Reflect.get(scope, 'end');
  if (scope === undefined || others.length > 0 || ruleType(scope) !== 'CSSScopeRule') {
    report(1, `must be exactly one ${shape}`);
    return null;
  }
  if (
    typeof start !== 'string' ||
    start.trim() !== `.${context.rootClass}` ||
    (end !== null && end !== undefined)
  ) {
    report(1, `must scope to its own root class only: @scope (.${context.rootClass})`);
    return null;
  }
  return scope;
}

export function validateCss(source: string, context: CssContext): CssCheck {
  const errors: PackError[] = [];
  const report: Report = (line, message) => {
    errors.push({ block: context.blockId, field: 'styles', line, message });
  };
  checkSource(source, report);
  const sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(source);
  } catch (error) {
    report(null, `is not valid CSS: ${error instanceof Error ? error.message : String(error)}`);
    return { styles: null, errors };
  }
  const scope = scopeRuleOf(sheet, context, report);
  if (scope !== null) checkScopedRules(childRules(scope), context, report);
  if (errors.length > 0) return { styles: null, errors };
  const [layer] = sheet.cssRules;
  return { styles: layer === undefined ? null : layer.cssText, errors };
}
