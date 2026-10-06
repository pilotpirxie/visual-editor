export {};

declare global {
  type SiteBehavior = {
    name: string;
    init(root: HTMLElement): () => void;
  };

  type SiteRuntime = {
    register(behavior: SiteBehavior): void;
    attach(root: Element): () => void;
    start(doc: Document): void;
  };

  var siteRuntime: SiteRuntime;

  interface Window {
    siteRuntime: SiteRuntime;
  }
}
