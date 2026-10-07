export type IconData = { body: string; width?: number; height?: number; hidden?: true };

export type IconStyle = { suffix: string; label: string };

export type IconSetData = {
  width: number;
  height: number;
  icons: Record<string, IconData>;
  aliases: Record<string, string>;
  styles: IconStyle[];
};

const DEFAULT_ICONIFY_SIZE = 16;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return value;
  return null;
}

function convertIcon(body: string, source: Record<string, unknown>): IconData {
  const icon: IconData = { body };
  const width = numberOrNull(source.width);
  const height = numberOrNull(source.height);
  if (width !== null) icon.width = width;
  if (height !== null) icon.height = height;
  if (source.hidden === true) icon.hidden = true;
  return icon;
}

function isPlainAlias(target: Record<string, unknown>): boolean {
  for (const key of Object.keys(target)) {
    if (key !== 'parent') return false;
  }
  return true;
}

function convertStyles(metadata: unknown, fallbackStyles: IconStyle[]): IconStyle[] {
  if (!isRecord(metadata) || !isRecord(metadata.suffixes)) return fallbackStyles;
  const styles: IconStyle[] = [];
  for (const [suffix, label] of Object.entries(metadata.suffixes)) {
    if (typeof label === 'string') styles.push({ suffix, label });
  }
  return styles;
}

export function iconStyleOf(name: string, styles: readonly IconStyle[]): string {
  let best = '';
  for (const { suffix } of styles) {
    const isLonger = suffix.length > best.length;
    if (suffix !== '' && isLonger && name.endsWith(`-${suffix}`)) best = suffix;
  }
  return best;
}

export function convertIconifySet(
  source: unknown,
  metadata: unknown = {},
  fallbackStyles: IconStyle[] = [],
): IconSetData {
  if (!isRecord(source) || !isRecord(source.icons)) {
    throw new Error('Icon set JSON must be an object with an "icons" object');
  }

  const icons: Record<string, IconData> = {};
  for (const [name, icon] of Object.entries(source.icons)) {
    if (!isRecord(icon) || typeof icon.body !== 'string') continue;
    icons[name] = convertIcon(icon.body, icon);
  }

  const aliases: Record<string, string> = {};
  const sourceAliases = isRecord(source.aliases) ? source.aliases : {};
  for (const [alias, target] of Object.entries(sourceAliases)) {
    if (!isRecord(target) || typeof target.parent !== 'string') continue;
    if (!isPlainAlias(target) || icons[target.parent] === undefined) continue;
    aliases[alias] = target.parent;
  }

  return {
    width: numberOrNull(source.width) ?? DEFAULT_ICONIFY_SIZE,
    height: numberOrNull(source.height) ?? DEFAULT_ICONIFY_SIZE,
    icons,
    aliases,
    styles: convertStyles(metadata, fallbackStyles),
  };
}
