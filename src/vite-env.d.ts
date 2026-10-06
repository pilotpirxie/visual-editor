declare module '*.hbs' {
  import type { TemplateDelegate } from 'handlebars';
  const template: TemplateDelegate;
  export default template;
}

declare module 'virtual:site-runtime' {
  export const core: string;
  export const behaviors: Record<string, string>;
}

declare module 'handlebars/runtime' {
  import Handlebars from 'handlebars';
  export default Handlebars;
}
