const JSON_WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const JSON_STRING = /^"(?:[^"\\]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/;
const JSON_LITERALS = ['true', 'false', 'null'];

type JsonCursor = { text: string; index: number };

export function lineAt(text: string, offset: number): number {
  let line = 1;
  for (const char of text.slice(0, offset)) if (char === '\n') line += 1;
  return line;
}

function skipWhitespace(cursor: JsonCursor): void {
  while (JSON_WHITESPACE.has(cursor.text.charAt(cursor.index))) cursor.index += 1;
}

function expectChar(cursor: JsonCursor, char: string): boolean {
  skipWhitespace(cursor);
  if (cursor.text.charAt(cursor.index) !== char) return false;
  cursor.index += 1;
  return true;
}

function matchToken(cursor: JsonCursor, pattern: RegExp): boolean {
  const match = pattern.exec(cursor.text.slice(cursor.index));
  if (match === null) return false;
  cursor.index += match[0].length;
  return true;
}

function readMembers(cursor: JsonCursor, close: string, readMember: () => boolean): boolean {
  if (expectChar(cursor, close)) return true;
  do {
    if (!readMember()) return false;
  } while (expectChar(cursor, ','));
  return expectChar(cursor, close);
}

function readJsonValue(cursor: JsonCursor): boolean {
  skipWhitespace(cursor);
  const char = cursor.text.charAt(cursor.index);
  if (char === '{') {
    cursor.index += 1;
    return readMembers(cursor, '}', () => {
      skipWhitespace(cursor);
      return matchToken(cursor, JSON_STRING) && expectChar(cursor, ':') && readJsonValue(cursor);
    });
  }
  if (char === '[') {
    cursor.index += 1;
    return readMembers(cursor, ']', () => readJsonValue(cursor));
  }
  if (char === '"') return matchToken(cursor, JSON_STRING);
  const literal = JSON_LITERALS.find((word) => cursor.text.startsWith(word, cursor.index));
  if (literal !== undefined) {
    cursor.index += literal.length;
    return true;
  }
  return matchToken(cursor, JSON_NUMBER);
}

export function jsonErrorLine(text: string): number {
  const cursor: JsonCursor = { text, index: 0 };
  const isValue = readJsonValue(cursor);
  if (isValue) skipWhitespace(cursor);
  return lineAt(text, cursor.index);
}
