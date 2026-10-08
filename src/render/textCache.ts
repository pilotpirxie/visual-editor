export function cachedByText<Value>(
  limit: number,
  compute: (text: string) => Value,
): (text: string) => Value {
  const cache = new Map<string, Value>();
  return (text) => {
    const cached = cache.get(text);
    if (cached !== undefined) {
      cache.delete(text);
      cache.set(text, cached);
      return cached;
    }
    const value = compute(text);
    cache.set(text, value);
    if (cache.size > limit) {
      const oldest = cache.keys().next();
      if (oldest.done !== true) cache.delete(oldest.value);
    }
    return value;
  };
}

export function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
