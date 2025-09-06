const hbs = `
<section class="team-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-white{{/if}} py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-12 text-center mb-5">
        <h2 class="display-5 font-weight-bold">{{sectionTitle}}</h2>
        <p class="lead text-muted">{{sectionSubtitle}}</p>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="team-card text-center">
          <div class="team-image mb-3">
            <img src="{{member1Photo}}" alt="{{member1Name}}" class="rounded-circle img-fluid shadow" style="width: 200px; height: 200px; object-fit: cover;">
          </div>
          <h5 class="font-weight-bold">{{member1Name}}</h5>
          <p class="text-primary font-weight-semibold">{{member1Position}}</p>
          <p class="text-muted">{{member1Bio}}</p>
          {{#if showSocialLinks}}
          <div class="social-links">
            {{#if member1LinkedIn}}
            <a href="{{member1LinkedIn}}" class="text-muted mr-2" target="_blank">
              <i class="material-icons responsive-icon">business</i>
            </a>
            {{/if}}
            {{#if member1Twitter}}
            <a href="{{member1Twitter}}" class="text-muted mr-2" target="_blank">
              <i class="material-icons responsive-icon">alternate_email</i>
            </a>
            {{/if}}
            {{#if member1Email}}
            <a href="mailto:{{member1Email}}" class="text-muted" target="_blank">
              <i class="material-icons responsive-icon">email</i>
            </a>
            {{/if}}
          </div>
          {{/if}}
        </div>
      </div>
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="team-card text-center">
          <div class="team-image mb-3">
            <img src="{{member2Photo}}" alt="{{member2Name}}" class="rounded-circle img-fluid shadow" style="width: 200px; height: 200px; object-fit: cover;">
          </div>
          <h5 class="font-weight-bold">{{member2Name}}</h5>
          <p class="text-primary font-weight-semibold">{{member2Position}}</p>
          <p class="text-muted">{{member2Bio}}</p>
          {{#if showSocialLinks}}
          <div class="social-links">
            {{#if member2LinkedIn}}
            <a href="{{member2LinkedIn}}" class="text-muted mr-2" target="_blank">
              <i class="material-icons responsive-icon">business</i>
            </a>
            {{/if}}
            {{#if member2Twitter}}
            <a href="{{member2Twitter}}" class="text-muted mr-2" target="_blank">
              <i class="material-icons responsive-icon">alternate_email</i>
            </a>
            {{/if}}
            {{#if member2Email}}
            <a href="mailto:{{member2Email}}" class="text-muted" target="_blank">
              <i class="material-icons responsive-icon">email</i>
            </a>
            {{/if}}
          </div>
          {{/if}}
        </div>
      </div>
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="team-card text-center">
          <div class="team-image mb-3">
            <img src="{{member3Photo}}" alt="{{member3Name}}" class="rounded-circle img-fluid shadow" style="width: 200px; height: 200px; object-fit: cover;">
          </div>
          <h5 class="font-weight-bold">{{member3Name}}</h5>
          <p class="text-primary font-weight-semibold">{{member3Position}}</p>
          <p class="text-muted">{{member3Bio}}</p>
          {{#if showSocialLinks}}
          <div class="social-links">
            {{#if member3LinkedIn}}
            <a href="{{member3LinkedIn}}" class="text-muted mr-2" target="_blank">
              <i class="material-icons responsive-icon">business</i>
            </a>
            {{/if}}
            {{#if member3Twitter}}
            <a href="{{member3Twitter}}" class="text-muted mr-2" target="_blank">
              <i class="material-icons responsive-icon">alternate_email</i>
            </a>
            {{/if}}
            {{#if member3Email}}
            <a href="mailto:{{member3Email}}" class="text-muted" target="_blank">
              <i class="material-icons responsive-icon">email</i>
            </a>
            {{/if}}
          </div>
          {{/if}}
        </div>
      </div>
    </div>
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Team Section #1',
  previewImageUrl: 'https://i.imgur.com/team1.png',
  category: 'team',
  defaultData: {
    sectionTitle: "Meet Our Team",
    sectionSubtitle: "Get to know the passionate people behind our success.",
    member1Name: "John Smith",
    member1Position: "CEO & Founder",
    member1Bio: "Visionary leader with 10+ years of experience in technology and business development.",
    member1Photo: "https://via.placeholder.com/200x200",
    member1LinkedIn: "https://linkedin.com",
    member1Twitter: "https://twitter.com",
    member1Email: "john@company.com",
    member2Name: "Sarah Johnson",
    member2Position: "CTO",
    member2Bio: "Technical expert passionate about building scalable solutions and leading engineering teams.",
    member2Photo: "https://via.placeholder.com/200x200",
    member2LinkedIn: "https://linkedin.com",
    member2Twitter: "https://twitter.com",
    member2Email: "sarah@company.com",
    member3Name: "Mike Davis",
    member3Position: "Head of Design",
    member3Bio: "Creative designer focused on user experience and bringing beautiful interfaces to life.",
    member3Photo: "https://via.placeholder.com/200x200",
    member3LinkedIn: "https://linkedin.com",
    member3Twitter: "https://twitter.com",
    member3Email: "mike@company.com",
    showSocialLinks: true,
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
    member1Name: {
      type: "string",
      name: 'Member 1 Name',
    },
    member1Position: {
      type: "string",
      name: 'Member 1 Position',
    },
    member1Bio: {
      type: "string",
      name: 'Member 1 Bio',
    },
    member1Photo: {
      type: "string",
      name: 'Member 1 Photo URL',
    },
    member1LinkedIn: {
      type: "string",
      name: 'Member 1 LinkedIn',
    },
    member1Twitter: {
      type: "string",
      name: 'Member 1 Twitter',
    },
    member1Email: {
      type: "string",
      name: 'Member 1 Email',
    },
    member2Name: {
      type: "string",
      name: 'Member 2 Name',
    },
    member2Position: {
      type: "string",
      name: 'Member 2 Position',
    },
    member2Bio: {
      type: "string",
      name: 'Member 2 Bio',
    },
    member2Photo: {
      type: "string",
      name: 'Member 2 Photo URL',
    },
    member2LinkedIn: {
      type: "string",
      name: 'Member 2 LinkedIn',
    },
    member2Twitter: {
      type: "string",
      name: 'Member 2 Twitter',
    },
    member2Email: {
      type: "string",
      name: 'Member 2 Email',
    },
    member3Name: {
      type: "string",
      name: 'Member 3 Name',
    },
    member3Position: {
      type: "string",
      name: 'Member 3 Position',
    },
    member3Bio: {
      type: "string",
      name: 'Member 3 Bio',
    },
    member3Photo: {
      type: "string",
      name: 'Member 3 Photo URL',
    },
    member3LinkedIn: {
      type: "string",
      name: 'Member 3 LinkedIn',
    },
    member3Twitter: {
      type: "string",
      name: 'Member 3 Twitter',
    },
    member3Email: {
      type: "string",
      name: 'Member 3 Email',
    },
    showSocialLinks: {
      type: "boolean",
      name: 'Show Social Links',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;