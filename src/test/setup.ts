import { afterEach } from 'vitest';
import { unmountAll } from './dom';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function escapeCssIdentifier(value: string): string {
  let escaped = '';
  for (let index = 0; index < value.length; index += 1) {
    const char = value.charAt(index);
    const code = value.charCodeAt(index);
    const isControl = (code >= 0x1 && code <= 0x1f) || code === 0x7f;
    const isDigit = code >= 0x30 && code <= 0x39;
    const startsWithDigit = index === 0 && isDigit;
    const digitAfterLeadingHyphen = index === 1 && isDigit && value.charAt(0) === '-';
    const isWordChar = /[\w-]/.test(char) || code >= 0x80;
    if (code === 0) {
      escaped += '�';
    } else if (isControl || startsWithDigit || digitAfterLeadingHyphen) {
      escaped += `\\${code.toString(16)} `;
    } else if (index === 0 && char === '-' && value.length === 1) {
      escaped += '\\-';
    } else if (isWordChar) {
      escaped += char;
    } else {
      escaped += `\\${char}`;
    }
  }
  return escaped;
}

function matchNothing(media: string): MediaQueryList {
  return {
    matches: false,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  };
}

function defineIfMissing(target: object, name: string, value: unknown): void {
  if (Reflect.get(target, name) !== undefined) return;
  Object.defineProperty(target, name, { value, configurable: true, writable: true });
}

defineIfMissing(globalThis, 'ResizeObserver', NoopResizeObserver);
defineIfMissing(globalThis, 'CSS', { escape: escapeCssIdentifier });
defineIfMissing(window, 'matchMedia', matchNothing);
defineIfMissing(Element.prototype, 'setPointerCapture', function setPointerCapture() {});
defineIfMissing(Element.prototype, 'releasePointerCapture', function releasePointerCapture() {});
defineIfMissing(Element.prototype, 'hasPointerCapture', function hasPointerCapture() {
  return false;
});

afterEach(() => {
  unmountAll();
  document.body.replaceChildren();
});
