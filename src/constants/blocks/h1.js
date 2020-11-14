const component = `
<section>
  <div class="container text-center">
    <strong>{{title}}</strong>
    <h1 class="display-4 my-3">{{tagline}}</h1>
    <a class="btn btn-link my-2" href="#">{{link}}</a>
  </div>
</section>
`;

export default {
  component,
  title: 'Simple Header',
  preview: '',
  category: 'header',
  config: {
    title: {
      type: "string",
      name: 'Title',
      default: "Hello World"
    },
    tagline: {
      type: "string",
      name: 'Tag Line',
      default: "Lorem ipsum dolor sit amet."
    },
    link: {
      type: "string",
      name: 'Text on the link',
      default: "Read more"
    }
  }
}
