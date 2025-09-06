const hbs = `
<section class="hero-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-light{{/if}} py-5">
  <div class="container">
    <div class="row align-items-center min-vh-50">
      <div class="col-lg-6">
        <h1 class="display-4 font-weight-bold mb-3">{{title}}</h1>
        <p class="lead mb-4">{{subtitle}}</p>
        <div class="d-flex flex-column flex-sm-row">
          {{#if showPrimaryButton}}
          <a href="{{primaryButtonLink}}" class="btn btn-primary btn-lg mb-2 mb-sm-0 mr-sm-3">
            {{#if primaryButtonIcon}}<i class="material-icons responsive-icon mr-2">{{primaryButtonIcon}}</i>{{/if}}
            {{primaryButtonText}}
          </a>
          {{/if}}
          {{#if showSecondaryButton}}
          <a href="{{secondaryButtonLink}}" class="btn btn-outline-secondary btn-lg">
            {{#if secondaryButtonIcon}}<i class="material-icons responsive-icon mr-2">{{secondaryButtonIcon}}</i>{{/if}}
            {{secondaryButtonText}}
          </a>
          {{/if}}
        </div>
      </div>
      {{#if showImage}}
      <div class="col-lg-6">
        <img src="{{heroImage}}" alt="{{heroImageAlt}}" class="img-fluid rounded shadow">
      </div>
      {{/if}}
    </div>
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Hero Section #1',
  previewImageUrl: 'https://i.imgur.com/hero1.png',
  category: 'header',
  defaultData: {
    title: "Build Amazing Products",
    subtitle: "Create stunning websites and applications with our powerful tools and modern design components.",
    primaryButtonText: "Get Started",
    primaryButtonLink: "#",
    primaryButtonIcon: "rocket_launch",
    secondaryButtonText: "Learn More",
    secondaryButtonLink: "#",
    secondaryButtonIcon: "play_arrow",
    heroImage: "https://via.placeholder.com/600x400",
    heroImageAlt: "Hero Image",
    showPrimaryButton: true,
    showSecondaryButton: true,
    showImage: true,
    useDarkTheme: false,
  },
  config: {
    title: {
      type: "string",
      name: 'Hero Title',
    },
    subtitle: {
      type: "string", 
      name: 'Hero Subtitle',
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
    heroImage: {
      type: "string",
      name: 'Hero Image URL',
    },
    heroImageAlt: {
      type: "string",
      name: 'Hero Image Alt Text',
    },
    showPrimaryButton: {
      type: "boolean",
      name: 'Show Primary Button',
    },
    showSecondaryButton: {
      type: "boolean",
      name: 'Show Secondary Button',
    },
    showImage: {
      type: "boolean",
      name: 'Show Hero Image',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;