const hbs = `
<div class="container">
  <div class="row">
    <div class="col-lg-3 col-md-4 col-6">
      <a href="#" class="d-block mb-4 h-100">
        <img class="img-fluid img-thumbnail" src="{{img1}}" alt="{{alt1}}">
      </a>
    </div>
    <div class="col-lg-3 col-md-4 col-6">
      <a href="#" class="d-block mb-4 h-100">
        <img class="img-fluid img-thumbnail" src="{{img2}}" alt="{{alt2}}">
      </a>
    </div>
    <div class="col-lg-3 col-md-4 col-6">
      <a href="#" class="d-block mb-4 h-100">
        <img class="img-fluid img-thumbnail" src="{{img3}}" alt="{{alt3}}">
      </a>
    </div>
    <div class="col-lg-3 col-md-4 col-6">
      <a href="#" class="d-block mb-4 h-100">
        <img class="img-fluid img-thumbnail" src="{{img4}}" alt="{{alt4}}">
      </a>
    </div>
  </div>
</div>
`;

const block = {
  hbs,
  name: '4 column gallery',
  previewImageUrl: 'https://i.imgur.com/jFFAd28.png',
  category: 'gallery',
  defaultData: {
    img1: "https://via.placeholder.com/450x450",
    img2: "https://via.placeholder.com/450x450.",
    img3: "https://via.placeholder.com/450x450",
    img4: "https://via.placeholder.com/450x450",
    alt1: "Sample image",
    alt2: "Sample image",
    alt3: "Sample image",
    alt4: "Sample image",
  },
  config: {
    img1: {
      type: "string",
      name: 'Url to image #1',
    },
    img2: {
      type: "string",
      name: 'Url to image #2',
    },
    img3: {
      type: "string",
      name: 'Url to image #3',
    },
    img4: {
      type: "string",
      name: 'Url to image #4',
    },
    alt1: {
      type: "string",
      name: 'Alt for image #1',
    },
    alt2: {
      type: "string",
      name: 'Alt for image #2',
    },
    alt3: {
      type: "string",
      name: 'Alt for image #3',
    },
    alt4: {
      type: "string",
      name: 'Alt for image #4',
    },
  }
};

export default block;
