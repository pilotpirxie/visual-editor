const hbs = `
<div class="container text-center">
  <strong>{{title}}</strong>
  <h1 class="display-4 my-3">{{tagline}}</h1>
  <a class="btn btn-link my-2" href="#">{{link}}</a>
</div>
`;

const block = {
  hbs,
  title: 'Simple Header #1',
  preview: 'https://i.imgur.com/IXz7LZ5.png',
  category: 'header',
  defaultData: {
    title: "Hello World",
    tagline: "Lorem ipsum dolor sit amet.",
    link: "Read more",
  },
  config: {
    title: {
      type: "string",
      name: 'Title',
    },
    tagline: {
      type: "string",
      name: 'Tag Line',
    },
    link: {
      type: "string",
      name: 'Text on the link',
    }
  }
};

export default block;
