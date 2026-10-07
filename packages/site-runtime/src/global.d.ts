export {};

declare global {
  type SiteBehavior = {
    name: string;
    init(root: HTMLElement): () => void;
  };

  type SiteStorage = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };

  type SiteRuntime = {
    register(behavior: SiteBehavior): void;
    attach(root: Element): () => void;
    start(doc: Document): void;
    storage: SiteStorage;
  };

  var siteRuntime: SiteRuntime;

  interface Window {
    siteRuntime: SiteRuntime;
  }
}
