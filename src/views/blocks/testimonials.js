import Handlebars from 'handlebars';

Handlebars.registerHelper('repeat', function(count, options) {
  let result = '';
  for (let i = 0; i < parseInt(count) || 0; i++) {
    result += options.fn(this);
  }
  return result;
});

const hbs = `
<section class="testimonials-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-light{{/if}} py-5">
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
          <div class="card-body">
            <div class="mb-3">
              {{#repeat testimonial1Rating}}
              <i class="material-icons responsive-icon text-warning">star</i>
              {{/repeat}}
            </div>
            <blockquote class="blockquote mb-0">
              <p class="mb-3">"{{testimonial1Text}}"</p>
              <footer class="blockquote-footer">
                <div class="d-flex align-items-center">
                  <img src="{{testimonial1Avatar}}" alt="{{testimonial1Name}}" class="rounded-circle mr-3" width="50" height="50">
                  <div>
                    <strong>{{testimonial1Name}}</strong>
                    <br>
                    <small class="text-muted">{{testimonial1Position}}</small>
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card h-100 {{#if useDarkTheme}}bg-secondary text-light{{else}}border-0 shadow-sm{{/if}}">
          <div class="card-body">
            <div class="mb-3">
              {{#repeat testimonial2Rating}}
              <i class="material-icons responsive-icon text-warning">star</i>
              {{/repeat}}
            </div>
            <blockquote class="blockquote mb-0">
              <p class="mb-3">"{{testimonial2Text}}"</p>
              <footer class="blockquote-footer">
                <div class="d-flex align-items-center">
                  <img src="{{testimonial2Avatar}}" alt="{{testimonial2Name}}" class="rounded-circle mr-3" width="50" height="50">
                  <div>
                    <strong>{{testimonial2Name}}</strong>
                    <br>
                    <small class="text-muted">{{testimonial2Position}}</small>
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card h-100 {{#if useDarkTheme}}bg-secondary text-light{{else}}border-0 shadow-sm{{/if}}">
          <div class="card-body">
            <div class="mb-3">
              {{#repeat testimonial3Rating}}
              <i class="material-icons responsive-icon text-warning">star</i>
              {{/repeat}}
            </div>
            <blockquote class="blockquote mb-0">
              <p class="mb-3">"{{testimonial3Text}}"</p>
              <footer class="blockquote-footer">
                <div class="d-flex align-items-center">
                  <img src="{{testimonial3Avatar}}" alt="{{testimonial3Name}}" class="rounded-circle mr-3" width="50" height="50">
                  <div>
                    <strong>{{testimonial3Name}}</strong>
                    <br>
                    <small class="text-muted">{{testimonial3Position}}</small>
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Testimonials Section #1',
  previewImageUrl: 'https://i.imgur.com/testimonials1.png',
  category: 'testimonials',
  defaultData: {
    sectionTitle: "What Our Clients Say",
    sectionSubtitle: "Don't just take our word for it - hear from some of our satisfied customers.",
    testimonial1Text: "This service exceeded all my expectations. The team was professional and delivered outstanding results.",
    testimonial1Name: "Sarah Johnson",
    testimonial1Position: "CEO, TechCorp",
    testimonial1Avatar: "https://via.placeholder.com/50x50",
    testimonial1Rating: 5,
    testimonial2Text: "I'm amazed by the quality and attention to detail. Highly recommended for anyone looking for excellence.",
    testimonial2Name: "Michael Chen",
    testimonial2Position: "Founder, StartupXYZ",
    testimonial2Avatar: "https://via.placeholder.com/50x50",
    testimonial2Rating: 5,
    testimonial3Text: "Working with this team was a game-changer for our business. They delivered beyond our expectations.",
    testimonial3Name: "Emily Rodriguez",
    testimonial3Position: "Marketing Director, GrowthCo",
    testimonial3Avatar: "https://via.placeholder.com/50x50",
    testimonial3Rating: 5,
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
    testimonial1Text: {
      type: "string",
      name: 'Testimonial 1 Text',
    },
    testimonial1Name: {
      type: "string",
      name: 'Testimonial 1 Name',
    },
    testimonial1Position: {
      type: "string",
      name: 'Testimonial 1 Position',
    },
    testimonial1Avatar: {
      type: "string",
      name: 'Testimonial 1 Avatar URL',
    },
    testimonial1Rating: {
      type: "number",
      name: 'Testimonial 1 Rating (1-5)',
    },
    testimonial2Text: {
      type: "string",
      name: 'Testimonial 2 Text',
    },
    testimonial2Name: {
      type: "string",
      name: 'Testimonial 2 Name',
    },
    testimonial2Position: {
      type: "string",
      name: 'Testimonial 2 Position',
    },
    testimonial2Avatar: {
      type: "string",
      name: 'Testimonial 2 Avatar URL',
    },
    testimonial2Rating: {
      type: "number",
      name: 'Testimonial 2 Rating (1-5)',
    },
    testimonial3Text: {
      type: "string",
      name: 'Testimonial 3 Text',
    },
    testimonial3Name: {
      type: "string",
      name: 'Testimonial 3 Name',
    },
    testimonial3Position: {
      type: "string",
      name: 'Testimonial 3 Position',
    },
    testimonial3Avatar: {
      type: "string",
      name: 'Testimonial 3 Avatar URL',
    },
    testimonial3Rating: {
      type: "number",
      name: 'Testimonial 3 Rating (1-5)',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;