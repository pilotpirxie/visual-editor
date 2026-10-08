import { DEVICES, type Block, type Device, type HtmlBlock } from '../app/types';
import { isRecord } from '../components/fields';
import { stripUnsafeHtml } from '../render/htmlSafety';
import { isValidAnchor, isValidClassName } from '../render/attributes';
import { isSafeCssValue } from '../render/sanitize';

export const TOKEN_NAME = /^--[a-z0-9-]+$/;

function parseOverrides(value: unknown): Record<string, string> {
  const overrides: Record<string, string> = {};
  if (!isRecord(value)) return overrides;
  for (const [token, tokenValue] of Object.entries(value)) {
    if (!TOKEN_NAME.test(token) || typeof tokenValue !== 'string') continue;
    if (isSafeCssValue(tokenValue)) overrides[token] = tokenValue;
  }
  return overrides;
}

function parseClasses(value: unknown): string[] {
  const classes: string[] = [];
  if (!Array.isArray(value)) return classes;
  for (const item of value) {
    if (typeof item === 'string' && isValidClassName(item)) classes.push(item);
  }
  return classes;
}

function parseDevices(value: unknown): Device[] {
  const devices: Device[] = [];
  if (!Array.isArray(value)) return devices;
  for (const device of DEVICES) {
    if (value.includes(device)) devices.push(device);
  }
  return devices;
}

function parseHtmlBlock(id: string, value: Record<string, unknown>): HtmlBlock | null {
  if (typeof value.html !== 'string') return null;
  const stripped = stripUnsafeHtml(value.html);
  const block: HtmlBlock = {
    id,
    kind: 'html',
    html: stripped.removed.length > 0 ? stripped.html : value.html,
    disabled: value.disabled === true,
    extraClasses: parseClasses(value.extraClasses),
    hideOn: parseDevices(value.hideOn),
  };
  if (typeof value.sourceComponentId === 'string') {
    block.sourceComponentId = value.sourceComponentId;
  }
  if (typeof value.anchor === 'string' && isValidAnchor(value.anchor)) block.anchor = value.anchor;
  return block;
}

export function parseBlock(value: unknown): Block | null {
  if (!isRecord(value)) return null;
  const { id, kind, anchor } = value;
  if (typeof id !== 'string' || id === '') return null;
  const optionalAnchor = typeof anchor === 'string' && isValidAnchor(anchor) ? { anchor } : {};
  if (kind === 'html') return parseHtmlBlock(id, value);
  if (kind !== 'component') return null;
  const { componentId, values } = value;
  if (typeof componentId !== 'string') return null;
  if (!isRecord(values)) return null;
  return {
    id,
    kind: 'component',
    componentId,
    values: structuredClone(values),
    overrides: parseOverrides(value.overrides),
    disabled: value.disabled === true,
    extraClasses: parseClasses(value.extraClasses),
    hideOn: parseDevices(value.hideOn),
    ...optionalAnchor,
  };
}
