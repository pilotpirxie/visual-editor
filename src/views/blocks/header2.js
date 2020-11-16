const hbs = `
<div class="jumbotron m-0">
  <div class="container text-center">
    <h1 class="display-4">{{title}}</h1>
    <p class="lead text-muted">{{tagline}}</p>
    <a class="btn btn-primary my-2" href="#">{{button}}</a>
    <a class="btn btn-link my-2" href="#">{{link}}</a>
  </div>
</div>
`;

const block = {
  hbs,
  name: 'Simple Header #2',
  previewImageUrl: 'https://i.imgur.com/1bYEKB4.png',
  category: 'header',
  defaultData: {
    title: "Hello World",
    tagline: "Lorem ipsum dolor sit amet.",
    button: "Click here",
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
    button: {
      type: "string",
      name: 'Text on the button',
    },
    link: {
      type: "string",
      name: 'Text on the link',
    }
  }
};

export default block;
