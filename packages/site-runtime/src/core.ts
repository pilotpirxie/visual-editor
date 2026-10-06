const behaviors = new Map<string, SiteBehavior>();
const cleanups = new WeakMap<Element, () => void>();

function register(behavior: SiteBehavior): void {
  behaviors.set(behavior.name, behavior);
}

function attach(root: Element): () => void {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-behavior]')];
  if (root instanceof HTMLElement && root.matches('[data-behavior]')) elements.unshift(root);

  const attached: HTMLElement[] = [];
  for (const element of elements) {
    if (cleanups.has(element)) continue;
    const disposers: Array<() => void> = [];
    const names = (element.dataset.behavior ?? '').split(/\s+/).filter(Boolean);
    for (const name of names) {
      const behavior = behaviors.get(name);
      if (!behavior) {
        console.warn(`siteRuntime: unknown behavior "${name}"`, element);
        continue;
      }
      disposers.push(behavior.init(element));
    }
    cleanups.set(element, () => disposers.forEach((dispose) => dispose()));
    attached.push(element);
  }

  return function detach() {
    for (const element of attached) {
      cleanups.get(element)?.();
      cleanups.delete(element);
    }
  };
}

function start(doc: Document): void {
  attach(doc.body);
}

window.siteRuntime = { register, attach, start };
