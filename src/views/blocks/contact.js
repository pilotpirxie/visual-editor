const hbs = `
<section class="contact-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-light{{/if}} py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-12 text-center mb-5">
        <h2 class="display-5 font-weight-bold">{{sectionTitle}}</h2>
        <p class="lead text-muted">{{sectionSubtitle}}</p>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-8 mx-auto">
        <div class="card {{#if useDarkTheme}}bg-secondary text-light{{else}}border-0 shadow{{/if}}">
          <div class="card-body p-5">
            <form>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group mb-4">
                    <label for="firstName" class="form-label">{{firstNameLabel}}</label>
                    <input type="text" class="form-control form-control-lg" id="firstName" placeholder="{{firstNamePlaceholder}}">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-4">
                    <label for="lastName" class="form-label">{{lastNameLabel}}</label>
                    <input type="text" class="form-control form-control-lg" id="lastName" placeholder="{{lastNamePlaceholder}}">
                  </div>
                </div>
              </div>
              <div class="form-group mb-4">
                <label for="email" class="form-label">{{emailLabel}}</label>
                <input type="email" class="form-control form-control-lg" id="email" placeholder="{{emailPlaceholder}}">
              </div>
              {{#if showPhone}}
              <div class="form-group mb-4">
                <label for="phone" class="form-label">{{phoneLabel}}</label>
                <input type="tel" class="form-control form-control-lg" id="phone" placeholder="{{phonePlaceholder}}">
              </div>
              {{/if}}
              {{#if showSubject}}
              <div class="form-group mb-4">
                <label for="subject" class="form-label">{{subjectLabel}}</label>
                <input type="text" class="form-control form-control-lg" id="subject" placeholder="{{subjectPlaceholder}}">
              </div>
              {{/if}}
              <div class="form-group mb-4">
                <label for="message" class="form-label">{{messageLabel}}</label>
                <textarea class="form-control" id="message" rows="5" placeholder="{{messagePlaceholder}}"></textarea>
              </div>
              <div class="text-center">
                <button type="submit" class="btn btn-primary btn-lg px-5">
                  {{#if buttonIcon}}<i class="material-icons responsive-icon mr-2">{{buttonIcon}}</i>{{/if}}
                  {{buttonText}}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    {{#if showContactInfo}}
    <div class="row mt-5">
      <div class="col-lg-4 text-center mb-4">
        <div class="contact-item">
          <div class="mb-3">
            <i class="material-icons responsive-icon text-primary" style="font-size: 3rem;">{{addressIcon}}</i>
          </div>
          <h5 class="font-weight-bold">{{addressTitle}}</h5>
          <p class="text-muted">{{addressText}}</p>
        </div>
      </div>
      <div class="col-lg-4 text-center mb-4">
        <div class="contact-item">
          <div class="mb-3">
            <i class="material-icons responsive-icon text-primary" style="font-size: 3rem;">{{phoneIcon}}</i>
          </div>
          <h5 class="font-weight-bold">{{phoneTitle}}</h5>
          <p class="text-muted">{{phoneText}}</p>
        </div>
      </div>
      <div class="col-lg-4 text-center mb-4">
        <div class="contact-item">
          <div class="mb-3">
            <i class="material-icons responsive-icon text-primary" style="font-size: 3rem;">{{emailIcon}}</i>
          </div>
          <h5 class="font-weight-bold">{{emailTitle}}</h5>
          <p class="text-muted">{{emailText}}</p>
        </div>
      </div>
    </div>
    {{/if}}
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Contact Section #1',
  previewImageUrl: 'https://i.imgur.com/contact1.png',
  category: 'contact',
  defaultData: {
    sectionTitle: "Get In Touch",
    sectionSubtitle: "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
    firstNameLabel: "First Name",
    firstNamePlaceholder: "Enter your first name",
    lastNameLabel: "Last Name",
    lastNamePlaceholder: "Enter your last name",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your email",
    phoneLabel: "Phone Number",
    phonePlaceholder: "Enter your phone number",
    subjectLabel: "Subject",
    subjectPlaceholder: "Enter subject",
    messageLabel: "Message",
    messagePlaceholder: "Enter your message here...",
    buttonText: "Send Message",
    buttonIcon: "send",
    showPhone: true,
    showSubject: true,
    showContactInfo: true,
    addressIcon: "location_on",
    addressTitle: "Address",
    addressText: "123 Business Street, Suite 100\nCity, State 12345",
    phoneIcon: "phone",
    phoneTitle: "Phone",
    phoneText: "+1 (555) 123-4567",
    emailIcon: "email",
    emailTitle: "Email",
    emailText: "info@company.com",
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
    firstNameLabel: {
      type: "string",
      name: 'First Name Label',
    },
    firstNamePlaceholder: {
      type: "string",
      name: 'First Name Placeholder',
    },
    lastNameLabel: {
      type: "string",
      name: 'Last Name Label',
    },
    lastNamePlaceholder: {
      type: "string",
      name: 'Last Name Placeholder',
    },
    emailLabel: {
      type: "string",
      name: 'Email Label',
    },
    emailPlaceholder: {
      type: "string",
      name: 'Email Placeholder',
    },
    phoneLabel: {
      type: "string",
      name: 'Phone Label',
    },
    phonePlaceholder: {
      type: "string",
      name: 'Phone Placeholder',
    },
    subjectLabel: {
      type: "string",
      name: 'Subject Label',
    },
    subjectPlaceholder: {
      type: "string",
      name: 'Subject Placeholder',
    },
    messageLabel: {
      type: "string",
      name: 'Message Label',
    },
    messagePlaceholder: {
      type: "string",
      name: 'Message Placeholder',
    },
    buttonText: {
      type: "string",
      name: 'Button Text',
    },
    buttonIcon: {
      type: "string",
      name: 'Button Icon',
    },
    showPhone: {
      type: "boolean",
      name: 'Show Phone Field',
    },
    showSubject: {
      type: "boolean",
      name: 'Show Subject Field',
    },
    showContactInfo: {
      type: "boolean",
      name: 'Show Contact Info',
    },
    addressIcon: {
      type: "string",
      name: 'Address Icon',
    },
    addressTitle: {
      type: "string",
      name: 'Address Title',
    },
    addressText: {
      type: "string",
      name: 'Address Text',
    },
    phoneIcon: {
      type: "string",
      name: 'Phone Icon',
    },
    phoneTitle: {
      type: "string",
      name: 'Phone Title',
    },
    phoneText: {
      type: "string",
      name: 'Phone Text',
    },
    emailIcon: {
      type: "string",
      name: 'Email Icon',
    },
    emailTitle: {
      type: "string",
      name: 'Email Title',
    },
    emailText: {
      type: "string",
      name: 'Email Text',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;