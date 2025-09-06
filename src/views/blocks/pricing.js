const hbs = `
<section class="pricing-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-white{{/if}} py-5">
<div class="container">
<div class="row justify-content-center">
  <div class="col-lg-4 col-md-6 mb-4">
    <div class="card {{#if useDarkTheme}}bg-secondary text-light{{else}}border shadow-sm{{/if}} h-100">
      <div class="card-header text-center {{#if useDarkTheme}}bg-dark{{else}}bg-light{{/if}}">
        <h5 class="card-title mb-0">{{plan1Name}}</h5>
      </div>
      <div class="card-body text-center">
        <div class="mb-3">
          <span class="display-4 font-weight-bold">{{plan1Price}}</span>
          <small class="text-muted">/{{plan1Period}}</small>
        </div>
        <p class="text-muted">{{plan1Description}}</p>
        <ul class="list-unstyled">
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan1Feature1}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan1Feature2}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan1Feature3}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan1Feature4}}</li>
        </ul>
      </div>
      <div class="card-footer text-center">
        <a href="{{plan1Link}}" class="btn btn-outline-primary btn-block">{{plan1ButtonText}}</a>
      </div>
    </div>
  </div>
  
  <div class="col-lg-4 col-md-6 mb-4">
    <div class="card {{#if useDarkTheme}}bg-secondary text-light{{else}}border shadow-sm{{/if}} h-100 {{#if plan2Popular}}border-primary{{/if}}">
      {{#if plan2Popular}}
      <div class="badge badge-primary position-absolute" style="top: -10px; right: 15px;">Popular</div>
      {{/if}}
      <div class="card-header text-center {{#if useDarkTheme}}bg-dark{{else}}bg-light{{/if}}">
        <h5 class="card-title mb-0">{{plan2Name}}</h5>
      </div>
      <div class="card-body text-center">
        <div class="mb-3">
          <span class="display-4 font-weight-bold">{{plan2Price}}</span>
          <small class="text-muted">/{{plan2Period}}</small>
        </div>
        <p class="text-muted">{{plan2Description}}</p>
        <ul class="list-unstyled">
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan2Feature1}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan2Feature2}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan2Feature3}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan2Feature4}}</li>
        </ul>
      </div>
      <div class="card-footer text-center">
        <a href="{{plan2Link}}" class="btn {{#if plan2Popular}}btn-primary{{else}}btn-outline-primary{{/if}} btn-block">{{plan2ButtonText}}</a>
      </div>
    </div>
  </div>
  
  <div class="col-lg-4 col-md-6 mb-4">
    <div class="card {{#if useDarkTheme}}bg-secondary text-light{{else}}border shadow-sm{{/if}} h-100">
      <div class="card-header text-center {{#if useDarkTheme}}bg-dark{{else}}bg-light{{/if}}">
        <h5 class="card-title mb-0">{{plan3Name}}</h5>
      </div>
      <div class="card-body text-center">
        <div class="mb-3">
          <span class="display-4 font-weight-bold">{{plan3Price}}</span>
          <small class="text-muted">/{{plan3Period}}</small>
        </div>
        <p class="text-muted">{{plan3Description}}</p>
        <ul class="list-unstyled">
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan3Feature1}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan3Feature2}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan3Feature3}}</li>
          <li class="mb-2"><i class="material-icons responsive-icon text-success mr-2">check_circle</i>{{plan3Feature4}}</li>
        </ul>
      </div>
      <div class="card-footer text-center">
        <a href="{{plan3Link}}" class="btn btn-outline-primary btn-block">{{plan3ButtonText}}</a>
      </div>
    </div>
  </div>
</div>
</div>
</section>
`;

const block = {
  hbs,
  name: 'Pricing Section #1',
  previewImageUrl: 'https://i.imgur.com/pricing1.png',
  category: 'pricing',
  defaultData: {
    sectionTitle: "Choose Your Plan",
    sectionSubtitle: "Select the perfect plan that fits your needs and budget.",
    plan1Name: "Basic",
    plan1Price: "9",
    plan1Period: "month",
    plan1Description: "Perfect for individuals getting started",
    plan1Feature1: "5 Projects",
    plan1Feature2: "10GB Storage",
    plan1Feature3: "Email Support",
    plan1Feature4: "Advanced Analytics",
    plan1ButtonText: "Get Started",
    plan1Link: "#",
    plan2Name: "Professional",
    plan2Price: "29",
    plan2Period: "month",
    plan2Description: "Ideal for growing businesses",
    plan2Feature1: "Unlimited Projects",
    plan2Feature2: "100GB Storage",
    plan2Feature3: "Priority Support",
    plan2Feature4: "Advanced Analytics",
    plan2ButtonText: "Get Started",
    plan2Link: "#",
    plan2Popular: true,
    plan3Name: "Enterprise",
    plan3Price: "99",
    plan3Period: "month",
    plan3Description: "For large organizations",
    plan3Feature1: "Unlimited Everything",
    plan3Feature2: "1TB Storage",
    plan3Feature3: "24/7 Phone Support",
    plan3Feature4: "Custom Integrations",
    plan3ButtonText: "Contact Sales",
    plan3Link: "#",
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
    plan1Name: {
      type: "string",
      name: 'Plan 1 Name',
    },
    plan1Price: {
      type: "string",
      name: 'Plan 1 Price',
    },
    plan1Period: {
      type: "string",
      name: 'Plan 1 Period',
    },
    plan1Description: {
      type: "string",
      name: 'Plan 1 Description',
    },
    plan1Feature1: {
      type: "string",
      name: 'Plan 1 Feature 1',
    },
    plan1Feature2: {
      type: "string",
      name: 'Plan 1 Feature 2',
    },
    plan1Feature3: {
      type: "string",
      name: 'Plan 1 Feature 3',
    },
    plan1Feature4: {
      type: "string",
      name: 'Plan 1 Feature 4',
    },
    plan1ButtonText: {
      type: "string",
      name: 'Plan 1 Button Text',
    },
    plan1Link: {
      type: "string",
      name: 'Plan 1 Link',
    },
    plan2Name: {
      type: "string",
      name: 'Plan 2 Name',
    },
    plan2Price: {
      type: "string",
      name: 'Plan 2 Price',
    },
    plan2Period: {
      type: "string",
      name: 'Plan 2 Period',
    },
    plan2Description: {
      type: "string",
      name: 'Plan 2 Description',
    },
    plan2Feature1: {
      type: "string",
      name: 'Plan 2 Feature 1',
    },
    plan2Feature2: {
      type: "string",
      name: 'Plan 2 Feature 2',
    },
    plan2Feature3: {
      type: "string",
      name: 'Plan 2 Feature 3',
    },
    plan2Feature4: {
      type: "string",
      name: 'Plan 2 Feature 4',
    },
    plan2ButtonText: {
      type: "string",
      name: 'Plan 2 Button Text',
    },
    plan2Link: {
      type: "string",
      name: 'Plan 2 Link',
    },
    plan2Popular: {
      type: "boolean",
      name: 'Plan 2 Popular',
    },
    plan3Name: {
      type: "string",
      name: 'Plan 3 Name',
    },
    plan3Price: {
      type: "string",
      name: 'Plan 3 Price',
    },
    plan3Period: {
      type: "string",
      name: 'Plan 3 Period',
    },
    plan3Description: {
      type: "string",
      name: 'Plan 3 Description',
    },
    plan3Feature1: {
      type: "string",
      name: 'Plan 3 Feature 1',
    },
    plan3Feature2: {
      type: "string",
      name: 'Plan 3 Feature 2',
    },
    plan3Feature3: {
      type: "string",
      name: 'Plan 3 Feature 3',
    },
    plan3Feature4: {
      type: "string",
      name: 'Plan 3 Feature 4',
    },
    plan3ButtonText: {
      type: "string",
      name: 'Plan 3 Button Text',
    },
    plan3Link: {
      type: "string",
      name: 'Plan 3 Link',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;