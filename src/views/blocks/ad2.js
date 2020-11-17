const hbs = `
<div>
  <div style="width: 300px; height: 250px; overflow: hidden;">
    <div style="display: flex; justify-content: space-between; width: 100%; flex-direction: column;">
      <div style="display: flex; justify-content: center; width: 100%; height: 125px; background-image: url('{{background}}'); background-size: cover; background-position: center;">
        <img src="{{logo}}" style="max-height: 60px; width: auto; margin: 10px;">
      </div>
      <div style="background: {{bottomBackgroundColor}}; height: 125px;">
        <div style="position: relative; top: -20px; display: flex; justify-content: center;">
          <div style="font-family: Arial, sans-serif; color: #fff; font-size: 0.9rem; font-weight: 700; text-align: center; background-color: #000; padding: 10px; width: max-content;">{{cta}}</div>
        </div>
        <div style="font-family: Arial, sans-serif; color: {{fontColor}}; text-align: center;">
          <div style="font-weight: 900; font-size: 1rem;">
            {{heading}}
          </div>
          <div style="font-size: 0.8rem; margin-top: 5px;">{{tagline}}</div>
        </div>
      </div>
    </div>
  </div>
</div>
`;

const block = {
  hbs,
  name: 'Ad #2',
  previewImageUrl: 'https://i.imgur.com/W5BGAjK.png',
  category: 'ad',
  defaultData: {
    background: 'https://via.placeholder.com/1450x1450',
    logo: 'https://via.placeholder.com/150x50',
    heading: 'YOUR NEXT AD',
    tagline: 'Promote your awesome products and services with this fancy ad.',
    cta: 'Call to action!',
    fontColor: '#000000',
    bottomBackgroundColor: '#f6f6f6',
  },
  config: {
    background: {
      type: "string",
      name: 'Background image URL',
    },
    logo: {
      type: "string",
      name: 'Logo image URL',
    },
    heading: {
      type: "string",
      name: 'Headline',
    },
    tagline: {
      type: "string",
      name: 'Tagline',
    },
    cta: {
      type: "string",
      name: 'Call to action',
    },
    fontColor: {
      type: "color",
      name: 'Color of the text',
    },
    bottomBackgroundColor: {
      type: "color",
      name: 'Color of the bottom background',
    },
  }
};

export default block;
