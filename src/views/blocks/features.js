const hbs = `
<section class="features-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-light{{/if}} py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-12 text-center mb-5">
        <h2 class="display-5 font-weight-bold">{{sectionTitle}}</h2>
        <p class="lead text-muted">{{sectionSubtitle}}</p>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card h-100 {{#if useDarkTheme}}bg-secondary text-light{{else}}border-0 shadow-sm{{/if}}">
          <div class="card-body text-center">
            <div class="mb-3">
              <i class="material-icons responsive-icon text-primary" style="font-size: 3rem;">{{feature1Icon}}</i>
            </div>
            <h5 class="card-title font-weight-bold">{{feature1Title}}</h5>
            <p class="card-text">{{feature1Description}}</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card h-100 {{#if useDarkTheme}}bg-secondary text-light{{else}}border-0 shadow-sm{{/if}}">
          <div class="card-body text-center">
            <div class="mb-3">
              <i class="material-icons responsive-icon text-primary" style="font-size: 3rem;">{{feature2Icon}}</i>
            </div>
            <h5 class="card-title font-weight-bold">{{feature2Title}}</h5>
            <p class="card-text">{{feature2Description}}</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card h-100 {{#if useDarkTheme}}bg-secondary text-light{{else}}border-0 shadow-sm{{/if}}">
          <div class="card-body text-center">
            <div class="mb-3">
              <i class="material-icons responsive-icon text-primary" style="font-size: 3rem;">{{feature3Icon}}</i>
            </div>
            <h5 class="card-title font-weight-bold">{{feature3Title}}</h5>
            <p class="card-text">{{feature3Description}}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Features Section #1',
  previewImageUrl: 'https://i.imgur.com/features1.png',
  category: 'article',
  defaultData: {
    sectionTitle: "Why Choose Us",
    sectionSubtitle: "Discover the key features that make our platform stand out from the competition.",
    feature1Icon: "speed",
    feature1Title: "Lightning Fast",
    feature1Description: "Experience blazing fast performance with our optimized infrastructure and cutting-edge technology.",
    feature2Icon: "security",
    feature2Title: "Secure & Reliable",
    feature2Description: "Your data is protected with enterprise-grade security and 99.9% uptime guarantee.",
    feature3Icon: "support_agent",
    feature3Title: "24/7 Support",
    feature3Description: "Get help whenever you need it with our dedicated support team available around the clock.",
    useDarkTheme: false,
  },
  config: {
    sectionTitle: {
      type: "string",
      name: 'Section Title',
    },
    sectionSubtitle: {
      type: "string",
      name: 'Section Subtitle',
    },
    feature1Icon: {
      type: "string",
      name: 'Feature 1 Icon',
    },
    feature1Title: {
      type: "string",
      name: 'Feature 1 Title',
    },
    feature1Description: {
      type: "string",
      name: 'Feature 1 Description',
    },
    feature2Icon: {
      type: "string",
      name: 'Feature 2 Icon',
    },
    feature2Title: {
      type: "string",
      name: 'Feature 2 Title',
    },
    feature2Description: {
      type: "string",
      name: 'Feature 2 Description',
    },
    feature3Icon: {
      type: "string",
      name: 'Feature 3 Icon',
    },
    feature3Title: {
      type: "string",
      name: 'Feature 3 Title',
    },
    feature3Description: {
      type: "string",
      name: 'Feature 3 Description',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;