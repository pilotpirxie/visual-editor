const hbs = `
<div>
  <div class="container">
    <div class="row">
      <div class="col-12">
        <h2 class="text-center">{{title}}</h2>
        <p class="text-center">{{description}}</p>
      </div>
    </div>
    <div class="row">
      <div class="col-sm-6 col-md-4 item">
        <a href="#">
            <img class="img-fluid" src="{{image1}}" />
        </a>
        <h3 class="name">{{articleTitle1}}</h3>
        <p class="description">{{text1}}</p>
      </div>
      <div class="col-sm-6 col-md-4 item">
        <a href="#">
            <img class="img-fluid" src="{{image2}}" />
        </a>
        <h3 class="name">{{articleTitle2}}</h3>
        <p class="description">{{text2}}</p>
      </div>
      <div class="col-sm-6 col-md-4 item">
        <a href="#">
            <img class="img-fluid" src="{{image3}}" />
        </a>
        <h3 class="name">{{articleTitle3}}</h3>
        <p class="description">{{text3}}</p>
      </div>
    </div>
  </div>
</div>
`;

const block = {
  hbs,
  name: 'Article #1',
  previewImageUrl: 'https://i.imgur.com/6QUsWtK.png',
  category: 'article',
  defaultData: {
    title: 'Sample section',
    description: 'Lorem ipsum dolor sit amet.',
    image1: 'https://via.placeholder.com/450x450',
    image2: 'https://via.placeholder.com/450x450',
    image3: 'https://via.placeholder.com/450x450',
    articleTitle1: 'Hello World',
    articleTitle2: 'Hello World',
    articleTitle3: 'Hello World',
    text1: 'Aenean tortor est, vulputate quis leo in, vehicula rhoncus lacus. Praesent aliquam in tellus eu gravida. Aliquam varius finibus est, interdum justo suscipit id.',
    text2: 'Aenean tortor est, vulputate quis leo in, vehicula rhoncus lacus. Praesent aliquam in tellus eu gravida. Aliquam varius finibus est, interdum justo suscipit id.',
    text3: 'Aenean tortor est, vulputate quis leo in, vehicula rhoncus lacus. Praesent aliquam in tellus eu gravida. Aliquam varius finibus est, interdum justo suscipit id.',
  },
  config: {
    title: {
      type: "string",
      name: 'Section title',
    },
    description: {
      type: "string",
      name: 'Section description',
    },
    image1: {
      type: "string",
      name: 'Url to image #1',
    },
    image2: {
      type: "string",
      name: 'Url to image #2',
    },
    image3: {
      type: "string",
      name: 'Url to image #3',
    },
    articleTitle1: {
      type: "string",
      name: 'Title for the article #1',
    },
    articleTitle2: {
      type: "string",
      name: 'Title for the article #2',
    },
    articleTitle3: {
      type: "string",
      name: 'Title for the article #3',
    },
    text1: {
      type: "string",
      name: 'Content for the article #1',
    },
    text2: {
      type: "string",
      name: 'Content for the article #2',
    },
    text3: {
      type: "string",
      name: 'Content for the article #3',
    },
  }
};

export default block;
