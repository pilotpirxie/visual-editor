const hbs = `
<nav class="navbar navbar-expand-lg {{#if useDarkTheme}}navbar-dark bg-dark{{else}}navbar-light bg-light{{/if}} sticky-top">
  <div class="container-fluid d-flex justify-content-between align-items-center">
    <!-- Logo/Brand -->
    <a class="navbar-brand d-flex align-items-center" href="{{brandLink}}" {{#if openInNewTab}}target="_blank"{{/if}}>
      {{#if showLogo}}
      <img src="{{logoUrl}}" alt="{{logoAlt}}" width="40" height="40" class="me-2">
      {{/if}}
      <span class="fw-bold text-gradient">{{brandName}}</span>
    </a>

    <!-- Mobile Menu Toggle -->
    <button class="navbar-toggler border-0 p-2 order-lg-3" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
            aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
      <span class="material-icons text-gradient">{{hamburgerIcon}}</span>
    </button>

    <!-- Navigation Menu -->
    <div class="collapse navbar-collapse order-lg-2" id="navbarNav">
      <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
        <!-- Products Dropdown -->
        {{#if showProductsDropdown}}
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle fw-medium" href="#" id="productsDropdown" role="button" 
             data-bs-toggle="dropdown" aria-expanded="false">
            {{productsMenuText}}
            {{#if showProductsBadge}}
            <span class="badge bg-primary rounded-pill ms-1">{{productsBadgeCount}}</span>
            {{/if}}
          </a>
          <ul class="dropdown-menu shadow-sm border-0" aria-labelledby="productsDropdown">
            {{#if showProduct1}}
            <li>
              <a class="dropdown-item py-2 px-3" href="{{product1Url}}" {{#if product1NewTab}}target="_blank"{{/if}}>
                {{#if product1Icon}}<span class="material-icons me-2" style="font-size: 18px;">{{product1Icon}}</span>{{/if}}
                {{product1Text}}
              </a>
            </li>
            {{/if}}
            {{#if showProduct2}}
            <li>
              <a class="dropdown-item py-2 px-3" href="{{product2Url}}" {{#if product2NewTab}}target="_blank"{{/if}}>
                {{#if product2Icon}}<span class="material-icons me-2" style="font-size: 18px;">{{product2Icon}}</span>{{/if}}
                {{product2Text}}
              </a>
            </li>
            {{/if}}
            {{#if showProduct3}}
            <li>
              <a class="dropdown-item py-2 px-3" href="{{product3Url}}" {{#if product3NewTab}}target="_blank"{{/if}}>
                {{#if product3Icon}}<span class="material-icons me-2" style="font-size: 18px;">{{product3Icon}}</span>{{/if}}
                {{product3Text}}
              </a>
            </li>
            {{/if}}
            {{#if showProduct4}}
            <li>
              <a class="dropdown-item py-2 px-3" href="{{product4Url}}" {{#if product4NewTab}}target="_blank"{{/if}}>
                {{#if product4Icon}}<span class="material-icons me-2" style="font-size: 18px;">{{product4Icon}}</span>{{/if}}
                {{product4Text}}
              </a>
            </li>
            {{/if}}
          </ul>
        </li>
        {{/if}}

        <!-- About Us Link -->
        {{#if showAboutUs}}
        <li class="nav-item">
          <a class="nav-link fw-medium" href="{{aboutUsLink}}" {{#if aboutUsNewTab}}target="_blank"{{/if}}>{{aboutUsText}}</a>
        </li>
        {{/if}}

        <!-- Docs Dropdown -->
        {{#if showDocsDropdown}}
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle fw-medium" href="#" id="docsDropdown" role="button" 
             data-bs-toggle="dropdown" aria-expanded="false">
            {{docsMenuText}}
            {{#if showDocsBadge}}
            <span class="badge bg-info rounded-pill ms-1">{{docsBadgeCount}}</span>
            {{/if}}
          </a>
          <ul class="dropdown-menu shadow-sm border-0" aria-labelledby="docsDropdown">
            {{#if showDoc1}}
            <li>
              <a class="dropdown-item py-2 px-3" href="{{doc1Url}}" {{#if doc1NewTab}}target="_blank"{{/if}} 
                 {{#if doc1External}}rel="noopener noreferrer"{{/if}}>
                {{#if doc1Icon}}<span class="material-icons me-2" style="font-size: 18px;">{{doc1Icon}}</span>{{/if}}
                {{doc1Text}}
              </a>
            </li>
            {{/if}}
            {{#if showDoc2}}
            <li>
              <a class="dropdown-item py-2 px-3" href="{{doc2Url}}" {{#if doc2NewTab}}target="_blank"{{/if}} 
                 {{#if doc2External}}rel="noopener noreferrer"{{/if}}>
                {{#if doc2Icon}}<span class="material-icons me-2" style="font-size: 18px;">{{doc2Icon}}</span>{{/if}}
                {{doc2Text}}
              </a>
            </li>
            {{/if}}
          </ul>
        </li>
        {{/if}}

        <!-- Community Link -->
        {{#if showCommunity}}
        <li class="nav-item">
          <a class="nav-link fw-medium" href="{{communityLink}}" {{#if communityNewTab}}target="_blank"{{/if}}>{{communityText}}</a>
        </li>
        {{/if}}
      </ul>
    </div>

    <!-- Action Buttons - Placed outside the navbar-collapse for desktop -->
    <div class="d-none d-lg-flex align-items-center order-lg-3">
      {{#if showPrimaryButton}}
      <button type="button" class="btn {{primaryButtonClass}} fw-medium me-2" 
              onclick="window.open('{{primaryButtonLink}}', '{{#if primaryButtonNewTab}}_blank{{else}}_self{{/if}}')">
        {{#if primaryButtonIcon}}
        <span class="material-icons me-1" style="font-size: 18px;">{{primaryButtonIcon}}</span>
        {{/if}}
        {{primaryButtonText}}
      </button>
      {{/if}}

      {{#if showSecondaryButton}}
      <button type="button" class="btn {{secondaryButtonClass}} fw-medium" 
              onclick="window.open('{{secondaryButtonLink}}', '{{#if secondaryButtonNewTab}}_blank{{else}}_self{{/if}}')">
        {{#if secondaryButtonIcon}}
        <span class="material-icons me-1" style="font-size: 18px;">{{secondaryButtonIcon}}</span>
        {{/if}}
        {{secondaryButtonText}}
      </button>
      {{/if}}
    </div>
  </div>
</nav>

<style>
/* Custom Navbar Styling based on original design */
.navbar {
  z-index: 999999;
  position: fixed;
  top: 0;
  background: transparent !important;
  width: 90%;
  left: 5%;
  right: 5%;
  padding: 8px 10px;
}

.navbar-brand {
  color: #fffdfd !important;
  font-size: 26px;
  font-weight: bold;
}

.navbar-brand img {
  height: 40px;
  margin-right: 10px;
}

.text-gradient {
  background: {{#if useDarkTheme}}#000{{else}}#000{{/if}};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.navbar-brand:hover .text-gradient {
  background: {{#if useDarkTheme}}#000{{else}}#000{{/if}};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Custom menu styling */
.navbar-nav {
  background: #181c25;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 8px 8px;
  border-radius: 27px;
}

.navbar-nav .nav-link {
  color: #fff !important;
  margin: 0 20px;
  transition: color 0.3s ease, text-shadow 0.3s ease;
  position: relative;
}

.navbar-nav .nav-link:hover {
  color: #5f5c5c !important;
  text-shadow: 1px -1px 13px rgba(10, 101, 192, 0.44);
}

/* Badge styling */
.badge {
  position: absolute;
  top: -8px;
  right: -5px;
  background: #41F182 !important;
  color: #181c25 !important;
  border-radius: 15px;
  padding: 1.5px 5px;
  font-size: 12px;
  font-weight: bold;
}

/* Dropdown styling */
.dropdown-menu {
  background-color: #14161D;
  border: none;
  border-radius: 10px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  padding: 10px 0;
  margin-top: 0.25rem;
}

.dropdown-item {
  color: #fff;
  padding: 12px 16px;
}

.dropdown-item:hover {
  background-color: #25272E;
  border-radius: 12px;
  color: #fff;
  margin: 0 4px;
}

/* Hamburger menu */
.navbar-toggler {
  border: none;
  color: #fff;
  font-size: 24px;
}

.navbar-toggler:focus {
  box-shadow: none;
}

.navbar-toggler .material-icons {
  color: #fff;
}

/* Action buttons */
.btn {
  margin-left: 10px;
  padding: 15px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #181c25;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #fff;
}

.btn-primary:hover {
  background: #25272E;
  border-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-success {
  background: #41F182;
  color: #000;
  border: none;
}

.btn-success:hover {
  background: #35D170;
  color: #000;
}

/* Mobile responsive */
@media (max-width: 992px) {
  .navbar {
    width: 100%;
    left: 0;
    right: 0;
    flex-wrap: wrap;
  }
  
  .navbar-nav {
    width: 100%;
    margin-top: 10px;
    padding: 15px 20px;
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .navbar-nav .nav-link {
    margin: 10px 0;
  }
  
  .d-flex.align-items-center {
    width: 100%;
    margin-top: 10px;
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .d-flex.align-items-center .btn {
    margin: 10px 0;
    width: 100%;
  }
  
  .dropdown-menu {
    position: static !important;
    background-color: transparent;
    box-shadow: none;
    transform: none !important;
  }
  
  .dropdown-item:hover {
    color: #000;
    background-color: #41F182;
    border-radius: 12px;
  }
  
  .nav-item.dropdown {
    margin: 10px 0;
  }
  
  /* Show mobile buttons */
  .d-none.d-lg-flex {
    display: none !important;
  }
  
  /* Show buttons inside collapsed menu for mobile */
  .navbar-collapse .d-flex.align-items-center {
    display: flex !important;
    width: 100%;
    margin-top: 10px;
    flex-direction: column;
  }
}

/* Dark theme overrides */
.navbar.navbar-dark .navbar-nav {
  background: #181c25;
}

.navbar.navbar-dark .navbar-nav .nav-link {
  color: #fff !important;
}

.navbar.navbar-dark .dropdown-menu {
  background-color: #14161D;
}

.navbar.navbar-dark .dropdown-item {
  color: #fff;
}

/* Light theme overrides */
.navbar.navbar-light .navbar-nav {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.navbar.navbar-light .navbar-nav .nav-link {
  color: #333 !important;
}

.navbar.navbar-light .navbar-nav .nav-link:hover {
  color: #667eea !important;
  text-shadow: 1px -1px 13px rgba(102, 126, 234, 0.3);
}

.navbar.navbar-light .dropdown-menu {
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.navbar.navbar-light .dropdown-item {
  color: #333;
}

.navbar.navbar-light .dropdown-item:hover {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.navbar.navbar-light .btn-primary {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #333;
}

.navbar.navbar-light .btn-primary:hover {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.2);
}
</style>

<script>
// Bootstrap 4.5 JavaScript untuk hamburger menu dan dropdown
document.addEventListener('DOMContentLoaded', function() {
  
  // Hamburger menu toggle
  const navbarToggler = document.querySelector('.navbar-toggler');
  const navbarCollapse = document.querySelector('.navbar-collapse');
  
  if (navbarToggler && navbarCollapse) {
    navbarToggler.addEventListener('click', function() {
      const isExpanded = navbarToggler.getAttribute('aria-expanded') === 'true';
      
      // Toggle aria-expanded
      navbarToggler.setAttribute('aria-expanded', !isExpanded);
      
      // Toggle collapse class
      if (navbarCollapse.classList.contains('show')) {
        navbarCollapse.classList.remove('show');
        navbarCollapse.classList.add('collapse');
      } else {
        navbarCollapse.classList.remove('collapse');
        navbarCollapse.classList.add('show');
      }
    });
  }
  
  // Dropdown functionality
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  
  dropdownToggles.forEach(function(toggle) {
    const dropdownMenu = toggle.nextElementSibling;
    
    // Desktop hover functionality
    const parentDropdown = toggle.closest('.dropdown');
    
    if (window.innerWidth > 992) {
      parentDropdown.addEventListener('mouseenter', function() {
        dropdownMenu.classList.add('show');
        toggle.setAttribute('aria-expanded', 'true');
      });
      
      parentDropdown.addEventListener('mouseleave', function() {
        dropdownMenu.classList.remove('show');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }
    
    // Mobile click functionality
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      
      if (window.innerWidth <= 992) {
        const isShown = dropdownMenu.classList.contains('show');
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
          menu.classList.remove('show');
        });
        document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(toggle) {
          toggle.setAttribute('aria-expanded', 'false');
        });
        
        // Toggle current dropdown
        if (!isShown) {
          dropdownMenu.classList.add('show');
          toggle.setAttribute('aria-expanded', 'true');
        }
      }
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
        menu.classList.remove('show');
      });
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      });
    }
  });
  
  // Close mobile menu when clicking on links
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link:not(.dropdown-toggle)');
  navLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 992 && navbarCollapse.classList.contains('show')) {
        navbarCollapse.classList.remove('show');
        navbarCollapse.classList.add('collapse');
        navbarToggler.setAttribute('aria-expanded', 'false');
      }
    });
  });
  
  // Responsive dropdown behavior
  function handleResize() {
    if (window.innerWidth > 992) {
      // Desktop: close any mobile-opened dropdowns
      document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
        menu.classList.remove('show');
      });
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      });
    }
  }
  
  window.addEventListener('resize', handleResize);
});
</script>
`;

const block = {
  hbs,
  name: 'Bootstrap Navbar #1',
  previewImageUrl: 'https://i.imgur.com/navbar1.png',
  category: 'header',
  defaultData: {
    brandName: "Silent Base",
    brandLink: "https://silentbase.xyz/",
    logoUrl: "/assets/images/logox.png",
    logoAlt: "Silent Base logo",
    hamburgerIcon: "menu",
    openInNewTab: true,
    useDarkTheme: false,
    showLogo: true,
    
    // Products Dropdown
    showProductsDropdown: true,
    productsMenuText: "Products",
    showProductsBadge: true,
    productsBadgeCount: "4",
    
    // Product Items
    showProduct1: true,
    product1Text: "Orderbook",
    product1Url: "https://app.silentbase.xyz/",
    product1NewTab: true,
    product1Icon: "assessment",
    
    showProduct2: true,
    product2Text: "Bridge",
    product2Url: "https://app.silentbase.xyz/bridge",
    product2NewTab: true,
    product2Icon: "compare_arrows",
    
    showProduct3: true,
    product3Text: "Staking",
    product3Url: "https://app.silentbase.xyz/staking",
    product3NewTab: true,
    product3Icon: "savings",
    
    showProduct4: true,
    product4Text: "AI Generative",
    product4Url: "https://ai.silentbase.xyz",
    product4NewTab: true,
    product4Icon: "psychology",
    
    // About Us
    showAboutUs: true,
    aboutUsText: "About Us",
    aboutUsLink: "https://ai.silentbase.xyz?href=about-us",
    aboutUsNewTab: false,
    
    // Docs Dropdown
    showDocsDropdown: true,
    docsMenuText: "Docs",
    showDocsBadge: true,
    docsBadgeCount: "2",
    
    // Doc Items
    showDoc1: true,
    doc1Text: "Whitepaper",
    doc1Url: "https://silentbase.xyz/files/whitepaper_v2.pdf",
    doc1NewTab: true,
    doc1External: true,
    doc1Icon: "description",
    
    showDoc2: true,
    doc2Text: "Documentation",
    doc2Url: "https://docs.silentbase.xyz/",
    doc2NewTab: true,
    doc2External: true,
    doc2Icon: "menu_book",
    
    // Community
    showCommunity: true,
    communityText: "Community",
    communityLink: "https://silentbase.xyz/#community",
    communityNewTab: true,
    
    // Action Buttons
    showPrimaryButton: true,
    primaryButtonText: "Crypto Swap",
    primaryButtonLink: "https://exchange.silentbase.xyz/",
    primaryButtonNewTab: true,
    primaryButtonIcon: "currency_exchange",
    primaryButtonClass: "btn-primary",
    
    showSecondaryButton: false,
    secondaryButtonText: "Learn More",
    secondaryButtonLink: "#",
    secondaryButtonNewTab: false,
    secondaryButtonIcon: "arrow_forward",
    secondaryButtonClass: "btn-outline-primary"
  },
  config: {
    brandName: {
      type: "string",
      name: 'Brand Name',
    },
    brandLink: {
      type: "string",
      name: 'Brand Link URL',
    },
    logoUrl: {
      type: "string",
      name: 'Logo Image URL',
    },
    logoAlt: {
      type: "string",
      name: 'Logo Alt Text',
    },
    hamburgerIcon: {
      type: "string",
      name: 'Mobile Menu Icon',
    },
    openInNewTab: {
      type: "boolean",
      name: 'Open Brand Link in New Tab',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
    showLogo: {
      type: "boolean",
      name: 'Show Logo Image',
    },
    showProductsDropdown: {
      type: "boolean",
      name: 'Show Products Dropdown',
    },
    productsMenuText: {
      type: "string",
      name: 'Products Menu Text',
    },
    showProductsBadge: {
      type: "boolean",
      name: 'Show Products Badge',
    },
    productsBadgeCount: {
      type: "string",
      name: 'Products Badge Count',
    },
    
    // Product 1
    showProduct1: {
      type: "boolean",
      name: 'Show Product 1',
    },
    product1Text: {
      type: "string",
      name: 'Product 1 Text',
    },
    product1Url: {
      type: "string",
      name: 'Product 1 URL',
    },
    product1NewTab: {
      type: "boolean",
      name: 'Product 1 Open in New Tab',
    },
    product1Icon: {
      type: "string",
      name: 'Product 1 Icon',
    },
    
    // Product 2
    showProduct2: {
      type: "boolean",
      name: 'Show Product 2',
    },
    product2Text: {
      type: "string",
      name: 'Product 2 Text',
    },
    product2Url: {
      type: "string",
      name: 'Product 2 URL',
    },
    product2NewTab: {
      type: "boolean",
      name: 'Product 2 Open in New Tab',
    },
    product2Icon: {
      type: "string",
      name: 'Product 2 Icon',
    },
    
    // Product 3
    showProduct3: {
      type: "boolean",
      name: 'Show Product 3',
    },
    product3Text: {
      type: "string",
      name: 'Product 3 Text',
    },
    product3Url: {
      type: "string",
      name: 'Product 3 URL',
    },
    product3NewTab: {
      type: "boolean",
      name: 'Product 3 Open in New Tab',
    },
    product3Icon: {
      type: "string",
      name: 'Product 3 Icon',
    },
    
    // Product 4
    showProduct4: {
      type: "boolean",
      name: 'Show Product 4',
    },
    product4Text: {
      type: "string",
      name: 'Product 4 Text',
    },
    product4Url: {
      type: "string",
      name: 'Product 4 URL',
    },
    product4NewTab: {
      type: "boolean",
      name: 'Product 4 Open in New Tab',
    },
    product4Icon: {
      type: "string",
      name: 'Product 4 Icon',
    },
    
    // About Us
    showAboutUs: {
      type: "boolean",
      name: 'Show About Us Link',
    },
    aboutUsText: {
      type: "string",
      name: 'About Us Text',
    },
    aboutUsLink: {
      type: "string",
      name: 'About Us Link URL',
    },
    aboutUsNewTab: {
      type: "boolean",
      name: 'Open About Us in New Tab',
    },
    
    // Docs Dropdown
    showDocsDropdown: {
      type: "boolean",
      name: 'Show Docs Dropdown',
    },
    docsMenuText: {
      type: "string",
      name: 'Docs Menu Text',
    },
    showDocsBadge: {
      type: "boolean",
      name: 'Show Docs Badge',
    },
    docsBadgeCount: {
      type: "string",
      name: 'Docs Badge Count',
    },
    
    // Doc 1
    showDoc1: {
      type: "boolean",
      name: 'Show Doc 1',
    },
    doc1Text: {
      type: "string",
      name: 'Doc 1 Text',
    },
    doc1Url: {
      type: "string",
      name: 'Doc 1 URL',
    },
    doc1NewTab: {
      type: "boolean",
      name: 'Doc 1 Open in New Tab',
    },
    doc1External: {
      type: "boolean",
      name: 'Doc 1 External Link',
    },
    doc1Icon: {
      type: "string",
      name: 'Doc 1 Icon',
    },
    
    // Doc 2
    showDoc2: {
      type: "boolean",
      name: 'Show Doc 2',
    },
    doc2Text: {
      type: "string",
      name: 'Doc 2 Text',
    },
    doc2Url: {
      type: "string",
      name: 'Doc 2 URL',
    },
    doc2NewTab: {
      type: "boolean",
      name: 'Doc 2 Open in New Tab',
    },
    doc2External: {
      type: "boolean",
      name: 'Doc 2 External Link',
    },
    doc2Icon: {
      type: "string",
      name: 'Doc 2 Icon',
    },
    
    // Community
    showCommunity: {
      type: "boolean",
      name: 'Show Community Link',
    },
    communityText: {
      type: "string",
      name: 'Community Text',
    },
    communityLink: {
      type: "string",
      name: 'Community Link URL',
    },
    communityNewTab: {
      type: "boolean",
      name: 'Open Community in New Tab',
    },
    
    // Action Buttons
    showPrimaryButton: {
      type: "boolean",
      name: 'Show Primary Button',
    },
    primaryButtonText: {
      type: "string",
      name: 'Primary Button Text',
    },
    primaryButtonLink: {
      type: "string",
      name: 'Primary Button Link',
    },
    primaryButtonNewTab: {
      type: "boolean",
      name: 'Open Primary Button in New Tab',
    },
    primaryButtonIcon: {
      type: "string",
      name: 'Primary Button Icon',
    },
    primaryButtonClass: {
      type: "string",
      name: 'Primary Button CSS Class',
    },
    showSecondaryButton: {
      type: "boolean",
      name: 'Show Secondary Button',
    },
    secondaryButtonText: {
      type: "string",
      name: 'Secondary Button Text',
    },
    secondaryButtonLink: {
      type: "string",
      name: 'Secondary Button Link',
    },
    secondaryButtonNewTab: {
      type: "boolean",
      name: 'Open Secondary Button in New Tab',
    },
    secondaryButtonIcon: {
      type: "string",
      name: 'Secondary Button Icon',
    },
    secondaryButtonClass: {
      type: "string",
      name: 'Secondary Button CSS Class',
    }
  }
};

export default block;