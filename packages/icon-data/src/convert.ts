export type IconData = { body: string; width?: number; height?: number; hidden?: true };

export type IconSetData = {
  width: number;
  height: number;
  icons: Record<string, IconData>;
  aliases: Record<string, string>;
};

const DEFAULT_ICONIFY_SIZE = 16;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function convertIconifySet(source: unknown): IconSetData {
  if (!isRecord(source) || !isRecord(source.icons)) {
    throw new Error('Icon set JSON must be an object with an "icons" object');
  }

  const icons: Record<string, IconData> = {};
  for (const [name, icon] of Object.entries(source.icons)) {
    if (!isRecord(icon) || typeof icon.body !== 'string') continue;
    const width = optionalNumber(icon.width);
    const height = optionalNumber(icon.height);
    icons[name] = {
      body: icon.body,
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
      ...(icon.hidden === true ? { hidden: true } : {}),
    };
  }

  const aliases: Record<string, string> = {};
  const sourceAliases = isRecord(source.aliases) ? source.aliases : {};
  for (const [alias, target] of Object.entries(sourceAliases)) {
    if (!isRecord(target) || typeof target.parent !== 'string') continue;
    const hasTransform = Object.keys(target).some((key) => key !== 'parent');
    if (hasTransform || icons[target.parent] === undefined) continue;
    aliases[alias] = target.parent;
  }

  return {
    width: optionalNumber(source.width) ?? DEFAULT_ICONIFY_SIZE,
    height: optionalNumber(source.height) ?? DEFAULT_ICONIFY_SIZE,
    icons,
    aliases,
  };
}
