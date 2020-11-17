const hbs = `
<div>
  <div style="width: 300px; height: 250px; overflow: hidden;">
    <div style="display: flex; justify-content: space-between; height: 100%; flex-direction: row;">
      <div style="background: {{leftBackgroundColor}}; width: 150px;">
        <div style="padding: 10px; font-family: Arial, sans-serif; color: {{fontColor}};">
          <div style="font-weight: 900; font-size: 1rem;">
            {{heading}}
          </div>
          <div style="font-family: Arial, sans-serif; color: {{fontColor}}; font-size: 0.75rem; margin-top: 5px;">{{tagline}}</div>
          <img src="{{logo}}" style="max-height: 60px; width: auto; margin-top: 10px;">
          <div style="color: #fff; font-size: 0.8rem; font-weight: 700; text-align: center; background-color: #000; padding: 10px; width: max-content; margin-top: 5px;">Konfiguruj teraz</div>
        </div>
      </div>
      <div style="width: 100%; width: 150px; background-image: url('{{background}}'); background-size: cover; background-position: center;"></div>
    </div>
  </div>
</div>
`;

const block = {
  hbs,
  name: 'Ad #4',
  previewImageUrl: 'https://i.imgur.com/XENmNh1.png',
  category: 'ad',
  defaultData: {
    background: 'https://via.placeholder.com/1450x1450',
    logo: 'https://via.placeholder.com/150x50',
    heading: 'YOUR NEXT AD',
    tagline: 'Promote your awesome products and services with this fancy ad.',
    cta: 'Call to action!',
    fontColor: '#000000',
    leftBackgroundColor: '#f6f6f6',
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
    leftBackgroundColor: {
      type: "color",
      name: 'Color of the left background',
    },
  }
};

export default block;
