const hbs = `
<section class="register-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-light{{/if}} py-5">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-6 col-md-8">
        <div class="card {{#if useDarkTheme}}bg-secondary text-light{{else}}shadow-lg border-0{{/if}}">
          <div class="card-header {{#if useDarkTheme}}bg-dark{{else}}bg-white{{/if}} text-center py-4">
            {{#if showLogo}}
            <img src="{{logoUrl}}" alt="{{companyName}}" class="mb-3" style="max-width: 120px;">
            {{/if}}
            <h4 class="font-weight-bold mb-0">{{registerTitle}}</h4>
            {{#if registerSubtitle}}
            <p class="text-muted small mb-0">{{registerSubtitle}}</p>
            {{/if}}
          </div>
          <div class="card-body p-4">
            {{#if showSocialLogin}}
            <div class="social-login mb-4">
              {{#if googleLogin}}
              <button class="btn btn-outline-danger btn-block mb-2">
                <i class="material-icons responsive-icon mr-2">account_circle</i>
                {{googleButtonText}}
              </button>
              {{/if}}
              {{#if facebookLogin}}
              <button class="btn btn-outline-primary btn-block mb-2">
                <i class="material-icons responsive-icon mr-2">facebook</i>
                {{facebookButtonText}}
              </button>
              {{/if}}
              <div class="text-center my-3">
                <span class="text-muted">{{orText}}</span>
              </div>
            </div>
            {{/if}}
            
            <form>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label for="firstName" class="form-label">{{firstNameLabel}}</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                          <i class="material-icons responsive-icon">person</i>
                        </span>
                      </div>
                      <input type="text" class="form-control {{#if useDarkTheme}}bg-dark text-light border-secondary{{/if}}" id="firstName" placeholder="{{firstNamePlaceholder}}" required>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label for="lastName" class="form-label">{{lastNameLabel}}</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                          <i class="material-icons responsive-icon">person_outline</i>
                        </span>
                      </div>
                      <input type="text" class="form-control {{#if useDarkTheme}}bg-dark text-light border-secondary{{/if}}" id="lastName" placeholder="{{lastNamePlaceholder}}" required>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="form-group mb-3">
                <label for="email" class="form-label">{{emailLabel}}</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                      <i class="material-icons responsive-icon">email</i>
                    </span>
                  </div>
                  <input type="email" class="form-control {{#if useDarkTheme}}bg-dark text-light border-secondary{{/if}}" id="email" placeholder="{{emailPlaceholder}}" required>
                </div>
              </div>
              
              {{#if showPhone}}
              <div class="form-group mb-3">
                <label for="phone" class="form-label">{{phoneLabel}}</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                      <i class="material-icons responsive-icon">phone</i>
                    </span>
                  </div>
                  <input type="tel" class="form-control {{#if useDarkTheme}}bg-dark text-light border-secondary{{/if}}" id="phone" placeholder="{{phonePlaceholder}}">
                </div>
              </div>
              {{/if}}
              
              <div class="form-group mb-3">
                <label for="password" class="form-label">{{passwordLabel}}</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                      <i class="material-icons responsive-icon">lock</i>
                    </span>
                  </div>
                  <input type="password" class="form-control {{#if useDarkTheme}}bg-dark text-light border-secondary{{/if}}" id="password" placeholder="{{passwordPlaceholder}}" required>
                  {{#if showPasswordToggle}}
                  <div class="input-group-append">
                    <button class="btn btn-outline-secondary" type="button" id="passwordToggle">
                      <i class="material-icons responsive-icon">visibility_off</i>
                    </button>
                  </div>
                  {{/if}}
                </div>
                {{#if showPasswordStrength}}
                <div class="progress mt-2" style="height: 5px;">
                  <div class="progress-bar bg-danger" role="progressbar" style="width: 25%"></div>
                </div>
                <small class="text-muted">{{passwordStrengthText}}</small>
                {{/if}}
              </div>
              
              <div class="form-group mb-3">
                <label for="confirmPassword" class="form-label">{{confirmPasswordLabel}}</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                      <i class="material-icons responsive-icon">lock_outline</i>
                    </span>
                  </div>
                  <input type="password" class="form-control {{#if useDarkTheme}}bg-dark text-light border-secondary{{/if}}" id="confirmPassword" placeholder="{{confirmPasswordPlaceholder}}" required>
                </div>
              </div>
              
              {{#if showTermsCheckbox}}
              <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="agreeTerms" required>
                <label class="form-check-label" for="agreeTerms">
                  {{termsCheckboxText}} <a href="{{termsUrl}}" class="{{#if useDarkTheme}}text-light{{else}}text-primary{{/if}}">{{termsLinkText}}</a>
                </label>
              </div>
              {{/if}}
              
              {{#if showNewsletterCheckbox}}
              <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="newsletter">
                <label class="form-check-label" for="newsletter">
                  {{newsletterCheckboxText}}
                </label>
              </div>
              {{/if}}
              
              <button type="submit" class="btn btn-primary btn-block btn-lg mb-3">
                <i class="material-icons responsive-icon mr-2">{{registerButtonIcon}}</i>
                {{registerButtonText}}
              </button>
            </form>
          </div>
          {{#if showLoginLink}}
          <div class="card-footer {{#if useDarkTheme}}bg-dark{{else}}bg-light{{/if}} text-center">
            <span class="text-muted">{{loginPromptText}}</span>
            <a href="{{loginUrl}}" class="{{#if useDarkTheme}}text-light{{else}}text-primary{{/if}} font-weight-bold">{{loginLinkText}}</a>
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
  name: 'Register Form Block',
  previewImageUrl: 'https://i.imgur.com/register-form.png',
  category: 'auth',
  defaultData: {
    registerTitle: "Create Account",
    registerSubtitle: "Join us today and get started",
    showLogo: true,
    logoUrl: "https://via.placeholder.com/120x40",
    companyName: "Your Company",
    showSocialLogin: true,
    googleLogin: true,
    googleButtonText: "Sign up with Google",
    facebookLogin: true,
    facebookButtonText: "Sign up with Facebook",
    orText: "or create account with email",
    firstNameLabel: "First Name",
    firstNamePlaceholder: "Enter your first name",
    lastNameLabel: "Last Name",
    lastNamePlaceholder: "Enter your last name",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your email",
    showPhone: true,
    phoneLabel: "Phone Number",
    phonePlaceholder: "Enter your phone number",
    passwordLabel: "Password",
    passwordPlaceholder: "Create a password",
    showPasswordToggle: true,
    showPasswordStrength: true,
    passwordStrengthText: "Use at least 8 characters with letters, numbers and symbols",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Confirm your password",
    showTermsCheckbox: true,
    termsCheckboxText: "I agree to the",
    termsLinkText: "Terms of Service",
    termsUrl: "#",
    showNewsletterCheckbox: true,
    newsletterCheckboxText: "Subscribe to our newsletter for updates",
    registerButtonText: "Create Account",
    registerButtonIcon: "person_add",
    showLoginLink: true,
    loginPromptText: "Already have an account?",
    loginLinkText: "Sign In",
    loginUrl: "#",
    useDarkTheme: false,
  },
  config: {
    registerTitle: {
      type: "string",
      name: 'Register Title',
    },
    registerSubtitle: {
      type: "string",
      name: 'Register Subtitle',
    },
    showLogo: {
      type: "boolean",
      name: 'Show Logo',
    },
    logoUrl: {
      type: "string",
      name: 'Logo URL',
    },
    companyName: {
      type: "string",
      name: 'Company Name',
    },
    showSocialLogin: {
      type: "boolean",
      name: 'Show Social Login',
    },
    googleLogin: {
      type: "boolean",
      name: 'Show Google Login',
    },
    googleButtonText: {
      type: "string",
      name: 'Google Button Text',
    },
    facebookLogin: {
      type: "boolean",
      name: 'Show Facebook Login',
    },
    facebookButtonText: {
      type: "string",
      name: 'Facebook Button Text',
    },
    orText: {
      type: "string",
      name: 'OR Text',
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
    showPhone: {
      type: "boolean",
      name: 'Show Phone Field',
    },
    phoneLabel: {
      type: "string",
      name: 'Phone Label',
    },
    phonePlaceholder: {
      type: "string",
      name: 'Phone Placeholder',
    },
    passwordLabel: {
      type: "string",
      name: 'Password Label',
    },
    passwordPlaceholder: {
      type: "string",
      name: 'Password Placeholder',
    },
    showPasswordToggle: {
      type: "boolean",
      name: 'Show Password Toggle',
    },
    showPasswordStrength: {
      type: "boolean",
      name: 'Show Password Strength',
    },
    passwordStrengthText: {
      type: "string",
      name: 'Password Strength Text',
    },
    confirmPasswordLabel: {
      type: "string",
      name: 'Confirm Password Label',
    },
    confirmPasswordPlaceholder: {
      type: "string",
      name: 'Confirm Password Placeholder',
    },
    showTermsCheckbox: {
      type: "boolean",
      name: 'Show Terms Checkbox',
    },
    termsCheckboxText: {
      type: "string",
      name: 'Terms Checkbox Text',
    },
    termsLinkText: {
      type: "string",
      name: 'Terms Link Text',
    },
    termsUrl: {
      type: "string",
      name: 'Terms URL',
    },
    showNewsletterCheckbox: {
      type: "boolean",
      name: 'Show Newsletter Checkbox',
    },
    newsletterCheckboxText: {
      type: "string",
      name: 'Newsletter Checkbox Text',
    },
    registerButtonText: {
      type: "string",
      name: 'Register Button Text',
    },
    registerButtonIcon: {
      type: "string",
      name: 'Register Button Icon',
    },
    showLoginLink: {
      type: "boolean",
      name: 'Show Login Link',
    },
    loginPromptText: {
      type: "string",
      name: 'Login Prompt Text',
    },
    loginLinkText: {
      type: "string",
      name: 'Login Link Text',
    },
    loginUrl: {
      type: "string",
      name: 'Login URL',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;