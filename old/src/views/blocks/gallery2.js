const hbs = `
<div class="container">
  <div class="row">
    <div class="col-6">
      <a href="#" class="d-block mb-4 h-100">
        <img class="img-fluid img-thumbnail" src="{{img1}}" alt="{{alt1}}">
      </a>
    </div>
    <div class="col-6">
      <a href="#" class="d-block mb-4 h-100">
        <img class="img-fluid img-thumbnail" src="{{img2}}" alt="{{alt2}}">
      </a>
    </div>
  </div>
</div>
`;

const block = {
  hbs,
  name: '2 column gallery',
  previewImageUrl: 'https://i.imgur.com/3hpsgRt.png',
  category: 'gallery',
  defaultData: {
    img1: "https://via.placeholder.com/450x450",
    img2: "https://via.placeholder.com/450x450.",
    alt1: "Sample image",
    alt2: "Sample image",
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
    alt1: {
      type: "string",
      name: 'Alt for image #1',
    },
    alt2: {
      type: "string",
      name: 'Alt for image #2',
    },
  }
};

export default block;
