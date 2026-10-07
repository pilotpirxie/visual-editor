export type FeatureCheck = { name: string; isSupported: boolean };

function supportsCss(condition: string): boolean {
  return (
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(condition)
  );
}

export function browserFeatureChecks(): FeatureCheck[] {
  return [
    { name: 'dialogs', isSupported: typeof HTMLDialogElement === 'function' },
    {
      name: 'popovers',
      isSupported: typeof HTMLElement === 'function' && 'showPopover' in HTMLElement.prototype,
    },
    { name: 'structured cloning', isSupported: typeof structuredClone === 'function' },
    { name: 'browser storage', isSupported: typeof indexedDB !== 'undefined' },
    { name: 'compression streams', isSupported: typeof CompressionStream === 'function' },
    {
      name: 'random ids',
      isSupported: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function',
    },
    { name: 'CSS @scope', isSupported: typeof CSSScopeRule === 'function' },
    { name: 'CSS :has()', isSupported: supportsCss('selector(:has(a))') },
  ];
}

export function missingFeatures(checks: readonly FeatureCheck[]): string[] {
  const missing: string[] = [];
  for (const check of checks) {
    if (!check.isSupported) missing.push(check.name);
  }
  return missing;
}
