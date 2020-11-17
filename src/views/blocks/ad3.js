const hbs = `
<div>
  <div style="width: 300px; height: 250px; overflow: hidden;">
    <div style="display: flex; justify-content: space-between; width: 100%; flex-direction: column;">
      <div style="display: flex; justify-content: center; width: 100%; height: 100px; background-image: url('{{background}}'); background-size: cover; background-position: center;">
        <img src="{{logo}}" style="max-height: 60px; width: auto; margin: 10px;">
      </div>
      <div style="background: {{bottomBackgroundColor}}; height: 150px;">
        <div style="position: relative; top: -12px; display: flex; justify-content: center;">
          <div style="font-family: Arial, sans-serif; color: {{promoFontColor}}; font-size: 0.75rem; font-weight: 700; text-align: center; background-color: {{promoBackgroundColor}}; padding: 5px 10px; width: max-content;">{{promo}}</div>
        </div>
        <div style="padding: 0 10px; font-family: Arial, sans-serif; color: {{fontColor}}; text-align: center;">
          <div style="font-family: Arial, sans-serif; font-weight: 900; color: #000; font-size: 1rem; text-align: center;">
            {{heading}}
          </div>
          <div style="font-size: 0.75rem; margin-top: 5px;">{{tagline}}</div>
          <div style="display: flex; justify-content: center;">
            <div style="font-size: 0.8rem; font-weight: 700; background-color: #000; color: #fff; padding: 10px; width: max-content; margin-top: 10px;">{{cta}}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`;

const block = {
  hbs,
  name: 'Ad #3',
  previewImageUrl: 'https://i.imgur.com/hSxQ9Iu.png',
  category: 'ad',
  defaultData: {
    background: 'https://via.placeholder.com/1450x1450',
    logo: 'https://via.placeholder.com/150x50',
    heading: 'YOUR NEXT AD',
    tagline: 'Promote your awesome products and services with this fancy ad.',
    promo: 'Buy now!',
    promoBackgroundColor: '#ffcb00',
    promoFontColor: '#000000',
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
    promo: {
      type: "string",
      name: 'Promo',
    },
    promoBackgroundColor: {
      type: "color",
      name: 'Promo background color',
    },
    promoFontColor: {
      type: "color",
      name: 'Promo font color',
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
