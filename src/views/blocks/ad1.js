const hbs = `
<div>
  <div style="display: flex; width: 300px; height: 250px; background-image: url('{{background}}'); background-size: cover; background-position: center;">
    <div style="display: flex; justify-content: space-between; width: 100%; flex-direction: column;">
      <div style="display: flex; justify-content: center; width: 100%; margin: 5px;">
        <img src="{{logo}}" style="max-height: 60px; width: auto;">
      </div>
      <div style="text-align: center; margin: 5px;">
        <div style="font-family: Arial, sans-serif; font-weight: 900; color: {{fontColor}}; font-size: 1.5rem;">
          {{heading}}
        </div>
        <div style="font-family: Arial, sans-serif; color: {{fontColor}}; font-size: 0.8rem;">{{tagline}}</div>
      </div>
      <div style="display: flex; justify-content: center; margin: 5px;">
        <div style="font-family: Arial, sans-serif; color: {{ctaFontColor}}; font-size: 0.9rem; background-color: {{ctaBackgroundColor}}; font-weight: 700; padding: 10px; width: max-content;">{{cta}}</div>
      </div>
    </div>
  </div>
</div>
`;

const block = {
  hbs,
  name: 'Ad #1',
  previewImageUrl: 'https://i.imgur.com/gkm7U5W.png',
  category: 'ad',
  defaultData: {
    background: 'https://via.placeholder.com/1450x1450',
    logo: 'https://via.placeholder.com/150x50',
    heading: 'YOUR NEXT AD',
    tagline: 'Promote your awesome products and services with this fancy ad.',
    cta: 'Call to action!',
    fontColor: '#ffffff',
    ctaFontColor: '#ffffff',
    ctaBackgroundColor: '#8d8d8d',
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
    ctaFontColor: {
      type: "color",
      name: 'Color of the font on the CTA',
    },
    ctaBackgroundColor: {
      type: "color",
      name: 'Color of the CTA',
    },
  }
};

export default block;
