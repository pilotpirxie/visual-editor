const hbs = `
<div class="text-center">
    <div class="container">
        <div class="row">
            <div class="col-md-4">
                <img src="https://via.placeholder.com/150x150" class="img-fluid" alt="" />
            </div>
            <div class="col-md-4">
                <img src="https://via.placeholder.com/150x150" class="img-fluid" alt="" />
            </div>
            <div class="col-md-4">
                <img src="https://via.placeholder.com/150x150" class="img-fluid" alt="" />
            </div>
        </div>
    </div>
</div>
`;

const block = {
  hbs,
  title: 'Image Gallery #1',
  preview: 'https://i.imgur.com/EwoDspY.png',
  category: 'gallery',
  defaultData: {
    img1: "https://via.placeholder.com/150x150",
    img2: "https://via.placeholder.com/150x150.",
    img3: "https://via.placeholder.com/150x150",
    alt1: "Sample image",
    alt2: "Sample image",
    alt3: "Sample image",
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
  }
};

export default block;
