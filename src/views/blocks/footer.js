const hbs = `
<footer class="footer-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-dark text-light{{/if}} py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-4 col-md-6 mb-4">
        <h5 class="font-weight-bold mb-3">{{companyName}}</h5>
        <p class="mb-3">{{companyDescription}}</p>
        {{#if showSocialMedia}}
        <div class="social-links">
          {{#if facebookUrl}}
          <a href="{{facebookUrl}}" class="text-light mr-3" target="_blank">
            <i class="material-icons responsive-icon">facebook</i>
          </a>
          {{/if}}
          {{#if twitterUrl}}
          <a href="{{twitterUrl}}" class="text-light mr-3" target="_blank">
            <i class="material-icons responsive-icon">{{twitterIcon}}</i>
          </a>
          {{/if}}
          {{#if linkedinUrl}}
          <a href="{{linkedinUrl}}" class="text-light mr-3" target="_blank">
            <i class="material-icons responsive-icon">business</i>
          </a>
          {{/if}}
          {{#if instagramUrl}}
          <a href="{{instagramUrl}}" class="text-light mr-3" target="_blank">
            <i class="material-icons responsive-icon">photo_camera</i>
          </a>
          {{/if}}
        </div>
        {{/if}}
      </div>
      <div class="col-lg-2 col-md-6 mb-4">
        <h6 class="font-weight-bold mb-3">{{menu1Title}}</h6>
        <ul class="list-unstyled">
          <li class="mb-2"><a href="{{menu1Link1Url}}" class="text-muted">{{menu1Link1Text}}</a></li>
          <li class="mb-2"><a href="{{menu1Link2Url}}" class="text-muted">{{menu1Link2Text}}</a></li>
          <li class="mb-2"><a href="{{menu1Link3Url}}" class="text-muted">{{menu1Link3Text}}</a></li>
          <li class="mb-2"><a href="{{menu1Link4Url}}" class="text-muted">{{menu1Link4Text}}</a></li>
        </ul>
      </div>
      <div class="col-lg-2 col-md-6 mb-4">
        <h6 class="font-weight-bold mb-3">{{menu2Title}}</h6>
        <ul class="list-unstyled">
          <li class="mb-2"><a href="{{menu2Link1Url}}" class="text-muted">{{menu2Link1Text}}</a></li>
          <li class="mb-2"><a href="{{menu2Link2Url}}" class="text-muted">{{menu2Link2Text}}</a></li>
          <li class="mb-2"><a href="{{menu2Link3Url}}" class="text-muted">{{menu2Link3Text}}</a></li>
          <li class="mb-2"><a href="{{menu2Link4Url}}" class="text-muted">{{menu2Link4Text}}</a></li>
        </ul>
      </div>
      <div class="col-lg-4 col-md-6 mb-4">
        <h6 class="font-weight-bold mb-3">{{newsletterTitle}}</h6>
        <p class="text-muted mb-3">{{newsletterDescription}}</p>
        {{#if showNewsletter}}
        <form class="newsletter-form">
          <div class="input-group">
            <input type="email" class="form-control" placeholder="{{newsletterPlaceholder}}" aria-label="Email">
            <div class="input-group-append">
              <button class="btn btn-primary" type="submit">
                <i class="material-icons responsive-icon">{{newsletterButtonIcon}}</i>
              </button>
            </div>
          </div>
        </form>
        {{/if}}
      </div>
    </div>
    <hr class="my-4">
    <div class="row align-items-center">
      <div class="col-md-6">
        <p class="mb-0 text-muted">{{copyrightText}}</p>
      </div>
      {{#if showFooterLinks}}
      <div class="col-md-6 text-md-right">
        <a href="{{privacyUrl}}" class="text-muted mr-3">{{privacyText}}</a>
        <a href="{{termsUrl}}" class="text-muted mr-3">{{termsText}}</a>
        <a href="{{cookieUrl}}" class="text-muted">{{cookieText}}</a>
      </div>
      {{/if}}
    </div>
  </div>
</footer>
`;

const block = {
  hbs,
  name: 'Footer Section #1',
  previewImageUrl: 'https://i.imgur.com/footer1.png',
  category: 'footer',
  defaultData: {
    companyName: "Your Company",
    companyDescription: "We create amazing digital experiences that help businesses grow and succeed in the modern world.",
    showSocialMedia: true,
    facebookUrl: "https://facebook.com",
    twitterUrl: "https://twitter.com",
    twitterIcon: "alternate_email",
    linkedinUrl: "https://linkedin.com",
    instagramUrl: "https://instagram.com",
    menu1Title: "Company",
    menu1Link1Text: "About Us",
    menu1Link1Url: "#",
    menu1Link2Text: "Our Team",
    menu1Link2Url: "#",
    menu1Link3Text: "Careers",
    menu1Link3Url: "#",
    menu1Link4Text: "Contact",
    menu1Link4Url: "#",
    menu2Title: "Services",
    menu2Link1Text: "Web Design",
    menu2Link1Url: "#",
    menu2Link2Text: "Development",
    menu2Link2Url: "#",
    menu2Link3Text: "SEO",
    menu2Link3Url: "#",
    menu2Link4Text: "Marketing",
    menu2Link4Url: "#",
    newsletterTitle: "Newsletter",
    newsletterDescription: "Subscribe to our newsletter to get the latest updates and news.",
    newsletterPlaceholder: "Enter your email",
    newsletterButtonIcon: "send",
    showNewsletter: true,
    copyrightText: "© 2024 Your Company. All rights reserved.",
    showFooterLinks: true,
    privacyText: "Privacy Policy",
    privacyUrl: "#",
    termsText: "Terms of Service",
    termsUrl: "#",
    cookieText: "Cookie Policy",
    cookieUrl: "#",
    useDarkTheme: false,
  },
  config: {
    companyName: {
      type: "string",
      name: 'Company Name',
    },
    companyDescription: {
      type: "string",
      name: 'Company Description',
    },
    showSocialMedia: {
      type: "boolean",
      name: 'Show Social Media',
    },
    facebookUrl: {
      type: "string",
      name: 'Facebook URL',
    },
    twitterUrl: {
      type: "string",
      name: 'Twitter URL',
    },
    twitterIcon: {
      type: "string",
      name: 'Twitter Icon',
    },
    linkedinUrl: {
      type: "string",
      name: 'LinkedIn URL',
    },
    instagramUrl: {
      type: "string",
      name: 'Instagram URL',
    },
    menu1Title: {
      type: "string",
      name: 'Menu 1 Title',
    },
    menu1Link1Text: {
      type: "string",
      name: 'Menu 1 Link 1 Text',
    },
    menu1Link1Url: {
      type: "string",
      name: 'Menu 1 Link 1 URL',
    },
    menu1Link2Text: {
      type: "string",
      name: 'Menu 1 Link 2 Text',
    },
    menu1Link2Url: {
      type: "string",
      name: 'Menu 1 Link 2 URL',
    },
    menu1Link3Text: {
      type: "string",
      name: 'Menu 1 Link 3 Text',
    },
    menu1Link3Url: {
      type: "string",
      name: 'Menu 1 Link 3 URL',
    },
    menu1Link4Text: {
      type: "string",
      name: 'Menu 1 Link 4 Text',
    },
    menu1Link4Url: {
      type: "string",
      name: 'Menu 1 Link 4 URL',
    },
    menu2Title: {
      type: "string",
      name: 'Menu 2 Title',
    },
    menu2Link1Text: {
      type: "string",
      name: 'Menu 2 Link 1 Text',
    },
    menu2Link1Url: {
      type: "string",
      name: 'Menu 2 Link 1 URL',
    },
    menu2Link2Text: {
      type: "string",
      name: 'Menu 2 Link 2 Text',
    },
    menu2Link2Url: {
      type: "string",
      name: 'Menu 2 Link 2 URL',
    },
    menu2Link3Text: {
      type: "string",
      name: 'Menu 2 Link 3 Text',
    },
    menu2Link3Url: {
      type: "string",
      name: 'Menu 2 Link 3 URL',
    },
    menu2Link4Text: {
      type: "string",
      name: 'Menu 2 Link 4 Text',
    },
    menu2Link4Url: {
      type: "string",
      name: 'Menu 2 Link 4 URL',
    },
    newsletterTitle: {
      type: "string",
      name: 'Newsletter Title',
    },
    newsletterDescription: {
      type: "string",
      name: 'Newsletter Description',
    },
    newsletterPlaceholder: {
      type: "string",
      name: 'Newsletter Placeholder',
    },
    newsletterButtonIcon: {
      type: "string",
      name: 'Newsletter Button Icon',
    },
    showNewsletter: {
      type: "boolean",
      name: 'Show Newsletter',
    },
    copyrightText: {
      type: "string",
      name: 'Copyright Text',
    },
    showFooterLinks: {
      type: "boolean",
      name: 'Show Footer Links',
    },
    privacyText: {
      type: "string",
      name: 'Privacy Policy Text',
    },
    privacyUrl: {
      type: "string",
      name: 'Privacy Policy URL',
    },
    termsText: {
      type: "string",
      name: 'Terms of Service Text',
    },
    termsUrl: {
      type: "string",
      name: 'Terms of Service URL',
    },
    cookieText: {
      type: "string",
      name: 'Cookie Policy Text',
    },
    cookieUrl: {
      type: "string",
      name: 'Cookie Policy URL',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;