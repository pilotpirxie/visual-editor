const hbs = `
<section class="about-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-white{{/if}} py-5">
  <div class="container">
    <div class="row align-items-center">
      {{#if imageOnLeft}}
      <div class="col-lg-6 mb-4 mb-lg-0">
        <img src="{{aboutImage}}" alt="{{aboutImageAlt}}" class="img-fluid rounded shadow">
      </div>
      {{/if}}
      <div class="col-lg-6">
        <div class="{{#unless imageOnLeft}}text-center{{/unless}}">
          <h2 class="display-5 font-weight-bold mb-4">{{title}}</h2>
          <p class="lead mb-4">{{description}}</p>
          <div class="row">
            {{#if showStats}}
            <div class="col-6 col-md-3 text-center mb-3">
              <div class="stats-item">
                <h3 class="display-6 font-weight-bold text-primary mb-0">{{stat1Number}}</h3>
                <small class="text-muted">{{stat1Label}}</small>
              </div>
            </div>
            <div class="col-6 col-md-3 text-center mb-3">
              <div class="stats-item">
                <h3 class="display-6 font-weight-bold text-primary mb-0">{{stat2Number}}</h3>
                <small class="text-muted">{{stat2Label}}</small>
              </div>
            </div>
            <div class="col-6 col-md-3 text-center mb-3">
              <div class="stats-item">
                <h3 class="display-6 font-weight-bold text-primary mb-0">{{stat3Number}}</h3>
                <small class="text-muted">{{stat3Label}}</small>
              </div>
            </div>
            <div class="col-6 col-md-3 text-center mb-3">
              <div class="stats-item">
                <h3 class="display-6 font-weight-bold text-primary mb-0">{{stat4Number}}</h3>
                <small class="text-muted">{{stat4Label}}</small>
              </div>
            </div>
            {{/if}}
          </div>
          {{#if showButton}}
          <a href="{{buttonLink}}" class="btn btn-primary btn-lg mt-3">
            {{#if buttonIcon}}<i class="material-icons responsive-icon mr-2">{{buttonIcon}}</i>{{/if}}
            {{buttonText}}
          </a>
          {{/if}}
        </div>
      </div>
      {{#unless imageOnLeft}}
      <div class="col-lg-6 mt-4 mt-lg-0">
        <img src="{{aboutImage}}" alt="{{aboutImageAlt}}" class="img-fluid rounded shadow">
      </div>
      {{/unless}}
    </div>
  </div>
</section>
`;

const block = {
  hbs,
  name: 'About Section #1',
  previewImageUrl: 'https://i.imgur.com/about1.png',
  category: 'about',
  defaultData: {
    title: "About Our Company",
    description: "We are a passionate team of innovators dedicated to creating exceptional digital experiences. With years of expertise and a commitment to excellence, we help businesses transform their ideas into reality.",
    aboutImage: "https://via.placeholder.com/600x400",
    aboutImageAlt: "About Us",
    imageOnLeft: true,
    showStats: true,
    stat1Number: "500+",
    stat1Label: "Projects",
    stat2Number: "10+",
    stat2Label: "Years",
    stat3Number: "50+",
    stat3Label: "Clients",
    stat4Number: "99%",
    stat4Label: "Satisfaction",
    showButton: true,
    buttonText: "Learn More",
    buttonLink: "#",
    buttonIcon: "info",
    useDarkTheme: false,
  },
  config: {
    title: {
      type: "string",
      name: 'Section Title',
    },
    description: {
      type: "string",
      name: 'Description',
    },
    aboutImage: {
      type: "string",
      name: 'About Image URL',
    },
    aboutImageAlt: {
      type: "string",
      name: 'About Image Alt Text',
    },
    imageOnLeft: {
      type: "boolean",
      name: 'Image on Left Side',
    },
    showStats: {
      type: "boolean",
      name: 'Show Statistics',
    },
    stat1Number: {
      type: "string",
      name: 'Statistic 1 Number',
    },
    stat1Label: {
      type: "string",
      name: 'Statistic 1 Label',
    },
    stat2Number: {
      type: "string",
      name: 'Statistic 2 Number',
    },
    stat2Label: {
      type: "string",
      name: 'Statistic 2 Label',
    },
    stat3Number: {
      type: "string",
      name: 'Statistic 3 Number',
    },
    stat3Label: {
      type: "string",
      name: 'Statistic 3 Label',
    },
    stat4Number: {
      type: "string",
      name: 'Statistic 4 Number',
    },
    stat4Label: {
      type: "string",
      name: 'Statistic 4 Label',
    },
    showButton: {
      type: "boolean",
      name: 'Show Button',
    },
    buttonText: {
      type: "string",
      name: 'Button Text',
    },
    buttonLink: {
      type: "string",
      name: 'Button Link',
    },
    buttonIcon: {
      type: "string",
      name: 'Button Icon',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;