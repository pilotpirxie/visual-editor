const hbs = `
<section class="login-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-light{{/if}} py-5">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-5 col-md-7">
        <div class="card {{#if useDarkTheme}}bg-secondary text-light{{else}}shadow-lg border-0{{/if}}">
          <div class="card-header {{#if useDarkTheme}}bg-dark{{else}}bg-white{{/if}} text-center py-4">
            {{#if showLogo}}
            <img src="{{logoUrl}}" alt="{{companyName}}" class="mb-3" style="max-width: 120px;">
            {{/if}}
            <h4 class="font-weight-bold mb-0">{{loginTitle}}</h4>
            {{#if loginSubtitle}}
            <p class="text-muted small mb-0">{{loginSubtitle}}</p>
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
              {{#if githubLogin}}
              <button class="btn btn-outline-dark btn-block mb-2">
                <i class="material-icons responsive-icon mr-2">code</i>
                {{githubButtonText}}
              </button>
              {{/if}}
              <div class="text-center my-3">
                <span class="text-muted">{{orText}}</span>
              </div>
            </div>
            {{/if}}
            
            <form>
              <div class="form-group mb-3">
                <label for="email" class="form-label">{{emailLabel}}</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                      <i class="material-icons responsive-icon">{{emailIcon}}</i>
                    </span>
                  </div>
                  <input type="email" class="form-control {{#if useDarkTheme}}bg-dark text-light border-secondary{{/if}}" id="email" placeholder="{{emailPlaceholder}}" required>
                </div>
              </div>
              
              <div class="form-group mb-3">
                <label for="password" class="form-label">{{passwordLabel}}</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text {{#if useDarkTheme}}bg-dark border-secondary{{/if}}">
                      <i class="material-icons responsive-icon">{{passwordIcon}}</i>
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
              </div>
              
              {{#if showRememberMe}}
              <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="rememberMe">
                <label class="form-check-label" for="rememberMe">
                  {{rememberMeText}}
                </label>
              </div>
              {{/if}}
              
              <button type="submit" class="btn btn-primary btn-block btn-lg mb-3">
                <i class="material-icons responsive-icon mr-2">{{loginButtonIcon}}</i>
                {{loginButtonText}}
              </button>
              
              {{#if showForgotPassword}}
              <div class="text-center mb-3">
                <a href="{{forgotPasswordUrl}}" class="{{#if useDarkTheme}}text-light{{else}}text-primary{{/if}} small">{{forgotPasswordText}}</a>
              </div>
              {{/if}}
            </form>
          </div>
          {{#if showSignupLink}}
          <div class="card-footer {{#if useDarkTheme}}bg-dark{{else}}bg-light{{/if}} text-center">
            <span class="text-muted">{{signupPromptText}}</span>
            <a href="{{signupUrl}}" class="{{#if useDarkTheme}}text-light{{else}}text-primary{{/if}} font-weight-bold">{{signupLinkText}}</a>
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
  name: 'Login Form Block',
  previewImageUrl: 'https://i.imgur.com/login-form.png',
  category: 'article',
  defaultData: {
    loginTitle: "Welcome Back",
    loginSubtitle: "Please sign in to your account",
    showLogo: true,
    logoUrl: "https://via.placeholder.com/120x40",
    companyName: "Your Company",
    showSocialLogin: true,
    googleLogin: true,
    googleButtonText: "Continue with Google",
    facebookLogin: true,
    facebookButtonText: "Continue with Facebook",
    githubLogin: false,
    githubButtonText: "Continue with GitHub",
    orText: "or sign in with email",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your email",
    emailIcon: "email",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    passwordIcon: "lock",
    showPasswordToggle: true,
    showRememberMe: true,
    rememberMeText: "Remember me",
    loginButtonText: "Sign In",
    loginButtonIcon: "login",
    showForgotPassword: true,
    forgotPasswordText: "Forgot your password?",
    forgotPasswordUrl: "#",
    showSignupLink: true,
    signupPromptText: "Don't have an account?",
    signupLinkText: "Sign Up",
    signupUrl: "#",
    useDarkTheme: false,
  },
  config: {
    loginTitle: {
      type: "string",
      name: 'Login Title',
    },
    loginSubtitle: {
      type: "string",
      name: 'Login Subtitle',
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
    githubLogin: {
      type: "boolean",
      name: 'Show GitHub Login',
    },
    githubButtonText: {
      type: "string",
      name: 'GitHub Button Text',
    },
    orText: {
      type: "string",
      name: 'OR Text',
    },
    emailLabel: {
      type: "string",
      name: 'Email Label',
    },
    emailPlaceholder: {
      type: "string",
      name: 'Email Placeholder',
    },
    emailIcon: {
      type: "string",
      name: 'Email Icon',
    },
    passwordLabel: {
      type: "string",
      name: 'Password Label',
    },
    passwordPlaceholder: {
      type: "string",
      name: 'Password Placeholder',
    },
    passwordIcon: {
      type: "string",
      name: 'Password Icon',
    },
    showPasswordToggle: {
      type: "boolean",
      name: 'Show Password Toggle',
    },
    showRememberMe: {
      type: "boolean",
      name: 'Show Remember Me',
    },
    rememberMeText: {
      type: "string",
      name: 'Remember Me Text',
    },
    loginButtonText: {
      type: "string",
      name: 'Login Button Text',
    },
    loginButtonIcon: {
      type: "string",
      name: 'Login Button Icon',
    },
    showForgotPassword: {
      type: "boolean",
      name: 'Show Forgot Password',
    },
    forgotPasswordText: {
      type: "string",
      name: 'Forgot Password Text',
    },
    forgotPasswordUrl: {
      type: "string",
      name: 'Forgot Password URL',
    },
    showSignupLink: {
      type: "boolean",
      name: 'Show Signup Link',
    },
    signupPromptText: {
      type: "string",
      name: 'Signup Prompt Text',
    },
    signupLinkText: {
      type: "string",
      name: 'Signup Link Text',
    },
    signupUrl: {
      type: "string",
      name: 'Signup URL',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;