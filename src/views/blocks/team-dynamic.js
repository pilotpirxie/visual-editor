const hbs = `
<section class="team-dynamic-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-white{{/if}} py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-12 text-center mb-5">
        <h2 class="display-5 font-weight-bold">{{sectionTitle}}</h2>
        <p class="lead text-muted">{{sectionSubtitle}}</p>
      </div>
    </div>
    <div class="row">
      {{#each teamMembers}}
      <div class="col-lg-{{../gridSize}} col-md-6 mb-4">
        <div class="team-card {{#if ../useDarkTheme}}bg-secondary text-light{{else}}bg-white shadow-sm{{/if}} p-4 rounded">
          {{#if ../showPhotos}}
          <div class="team-image text-center mb-3">
            <img src="{{photo}}" alt="{{name}}" class="rounded-circle img-fluid shadow" style="width: {{../photoSize}}px; height: {{../photoSize}}px; object-fit: cover;">
          </div>
          {{/if}}
          <div class="{{#if ../centerAlign}}text-center{{/if}}">
            <h5 class="font-weight-bold mb-1">{{name}}</h5>
            <p class="text-primary font-weight-semibold mb-2">{{position}}</p>
            {{#if ../showDepartment}}
            <small class="text-muted d-block mb-2">{{department}}</small>
            {{/if}}
            {{#if ../showBio}}
            <p class="text-muted small">{{bio}}</p>
            {{/if}}
            {{#if ../showSkills}}
            <div class="skills mb-3">
              {{#each skills}}
              <span class="badge badge-{{#if ../../useDarkTheme}}light{{else}}primary{{/if}} mr-1 mb-1">{{this}}</span>
              {{/each}}
            </div>
            {{/if}}
            {{#if ../showContact}}
            <div class="contact-info">
              {{#if email}}
              <a href="mailto:{{email}}" class="text-muted mr-2" title="Email">
                <i class="material-icons">email</i>
              </a>
              {{/if}}
              {{#if phone}}
              <a href="tel:{{phone}}" class="text-muted mr-2" title="Phone">
                <i class="material-icons">phone</i>
              </a>
              {{/if}}
              {{#if linkedin}}
              <a href="{{linkedin}}" class="text-muted mr-2" target="_blank" title="LinkedIn">
                <i class="material-icons">business</i>
              </a>
              {{/if}}
              {{#if twitter}}
              <a href="{{twitter}}" class="text-muted mr-2" target="_blank" title="Twitter">
                <i class="material-icons">alternate_email</i>
              </a>
              {{/if}}
            </div>
            {{/if}}
          </div>
        </div>
      </div>
      {{/each}}
    </div>
    {{#if showLoadMore}}
    <div class="row">
      <div class="col-12 text-center">
        <button class="btn btn-outline-primary btn-lg" id="loadMoreTeam">
          <i class="material-icons mr-2">expand_more</i>
          {{loadMoreText}}
        </button>
      </div>
    </div>
    {{/if}}
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Dynamic Team Section',
  previewImageUrl: 'https://i.imgur.com/team-dynamic.png',
  category: 'team',
  defaultData: {
    sectionTitle: "Our Dynamic Team",
    sectionSubtitle: "Meet our talented professionals from different departments.",
    gridSize: "4", // 3 columns (12/4=3)
    photoSize: 150,
    showPhotos: true,
    showBio: true,
    showSkills: true,
    showDepartment: true,
    showContact: true,
    centerAlign: true,
    showLoadMore: true,
    loadMoreText: "Load More Team Members",
    teamMembers: [
      {
        name: "Alice Johnson",
        position: "Senior Developer",
        department: "Engineering",
        bio: "Full-stack developer with expertise in modern web technologies and cloud architecture.",
        photo: "https://via.placeholder.com/150x150",
        skills: ["React", "Node.js", "AWS", "Docker"],
        email: "alice@company.com",
        phone: "+1234567890",
        linkedin: "https://linkedin.com/in/alice",
        twitter: "https://twitter.com/alice"
      },
      {
        name: "Bob Smith",
        position: "UX Designer",
        department: "Design",
        bio: "Creative designer focused on user-centered design and innovative digital experiences.",
        photo: "https://via.placeholder.com/150x150",
        skills: ["Figma", "Adobe XD", "Prototyping", "User Research"],
        email: "bob@company.com",
        linkedin: "https://linkedin.com/in/bob"
      },
      {
        name: "Carol Wilson",
        position: "Marketing Manager",
        department: "Marketing",
        bio: "Data-driven marketing professional with expertise in digital campaigns and growth strategies.",
        photo: "https://via.placeholder.com/150x150",
        skills: ["SEO", "Google Ads", "Analytics", "Content Marketing"],
        email: "carol@company.com",
        phone: "+1234567891",
        twitter: "https://twitter.com/carol"
      }
    ],
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
    gridSize: {
      type: "select",
      name: 'Grid Size (Columns)',
      options: [
        { value: "12", label: "1 Column" },
        { value: "6", label: "2 Columns" },
        { value: "4", label: "3 Columns" },
        { value: "3", label: "4 Columns" }
      ]
    },
    photoSize: {
      type: "number",
      name: 'Photo Size (px)',
    },
    showPhotos: {
      type: "boolean",
      name: 'Show Photos',
    },
    showBio: {
      type: "boolean",
      name: 'Show Bio',
    },
    showSkills: {
      type: "boolean",
      name: 'Show Skills',
    },
    showDepartment: {
      type: "boolean",
      name: 'Show Department',
    },
    showContact: {
      type: "boolean",
      name: 'Show Contact Info',
    },
    centerAlign: {
      type: "boolean",
      name: 'Center Align Content',
    },
    showLoadMore: {
      type: "boolean",
      name: 'Show Load More Button',
    },
    loadMoreText: {
      type: "string",
      name: 'Load More Button Text',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;