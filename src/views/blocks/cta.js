const hbs = `
<section class="cta-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-primary text-white{{/if}} py-5">
  <div class="container">
    <div class="row align-items-center">
      <div class="col-lg-8">
        <h2 class="display-5 font-weight-bold mb-3">{{title}}</h2>
        <p class="lead mb-0">{{subtitle}}</p>
      </div>
      <div class="col-lg-4 text-lg-right mt-3 mt-lg-0">
        {{#if showPrimaryButton}}
        <a href="{{primaryButtonLink}}" class="btn {{#if useDarkTheme}}btn-light{{else}}btn-light{{/if}} btn-lg mr-3 mb-2 mb-sm-0">
          {{#if primaryButtonIcon}}<i class="material-icons responsive-icon responsive-icon mr-2">{{primaryButtonIcon}}</i>{{/if}}
          {{primaryButtonText}}
        </a>
        {{/if}}
        {{#if showSecondaryButton}}
        <a href="{{secondaryButtonLink}}" class="btn btn-outline-light btn-lg">
          {{#if secondaryButtonIcon}}<i class="material-icons responsive-icon responsive-icon mr-2">{{secondaryButtonIcon}}</i>{{/if}}
          {{secondaryButtonText}}
        </a>
        {{/if}}
      </div>
    </div>
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Call to Action Section #1',
  previewImageUrl: 'https://i.imgur.com/cta1.png',
  category: 'article',
  defaultData: {
    title: "Ready to Get Started?",
    subtitle: "Join thousands of satisfied customers who trust our platform to grow their business.",
    primaryButtonText: "Start Free Trial",
    primaryButtonLink: "#",
    primaryButtonIcon: "play_arrow",
    secondaryButtonText: "Learn More",
    secondaryButtonLink: "#",
    secondaryButtonIcon: "info",
    showPrimaryButton: true,
    showSecondaryButton: true,
    useDarkTheme: false,
  },
  config: {
    title: {
      type: "string",
      name: 'CTA Title',
    },
    subtitle: {
      type: "string",
      name: 'CTA Subtitle',
    },
    primaryButtonText: {
      type: "string",
      name: 'Primary Button Text',
    },
    primaryButtonLink: {
      type: "string",
      name: 'Primary Button Link',
    },
    primaryButtonIcon: {
      type: "string",
      name: 'Primary Button Icon',
    },
    secondaryButtonText: {
      type: "string",
      name: 'Secondary Button Text',
    },
    secondaryButtonLink: {
      type: "string",
      name: 'Secondary Button Link',
    },
    secondaryButtonIcon: {
      type: "string",
      name: 'Secondary Button Icon',
    },
    showPrimaryButton: {
      type: "boolean",
      name: 'Show Primary Button',
    },
    showSecondaryButton: {
      type: "boolean",
      name: 'Show Secondary Button',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;