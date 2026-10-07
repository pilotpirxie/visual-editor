const behaviors = new Map<string, SiteBehavior>();
const cleanups = new WeakMap<Element, () => void>();

function register(behavior: SiteBehavior): void {
  behaviors.set(behavior.name, behavior);
}

const WHITESPACE = /\s+/;

function behaviorNamesOf(element: HTMLElement): string[] {
  const names: string[] = [];
  for (const name of (element.dataset.behavior ?? '').split(WHITESPACE)) {
    if (name !== '') names.push(name);
  }
  return names;
}

function attach(root: Element): () => void {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-behavior]')];
  if (root instanceof HTMLElement && root.matches('[data-behavior]')) elements.unshift(root);

  const attached: HTMLElement[] = [];
  for (const element of elements) {
    if (cleanups.has(element)) continue;
    const disposers: Array<() => void> = [];
    const names = behaviorNamesOf(element);
    for (const name of names) {
      const behavior = behaviors.get(name);
      if (behavior === undefined) {
        console.warn(`siteRuntime: unknown behavior "${name}"`, element);
        continue;
      }
      try {
        disposers.push(behavior.init(element));
      } catch (error) {
        console.error(`siteRuntime: behavior "${name}" failed to start`, element, error);
      }
    }
    cleanups.set(element, () => {
      for (const dispose of disposers) dispose();
    });
    attached.push(element);
  }

  return function detach() {
    for (const element of attached) {
      const cleanup = cleanups.get(element);
      if (cleanup !== undefined) cleanup();
      cleanups.delete(element);
    }
  };
}

function start(doc: Document): void {
  attach(doc.body);
}

function browserStorage(): SiteStorage {
  return {
    getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.warn(`siteRuntime: could not read "${key}" from storage`, error);
        return null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`siteRuntime: could not save "${key}" to storage`, error);
      }
    },
  };
}

window.siteRuntime = { register, attach, start, storage: browserStorage() };
