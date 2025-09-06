const hbs = `
<section class="search-explorer-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-white{{/if}} py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-12 text-center mb-5">
        <h2 class="display-5 font-weight-bold">{{sectionTitle}}</h2>
        <p class="lead text-muted">{{sectionSubtitle}}</p>
      </div>
    </div>
    
    <!-- Search Form -->
    <div class="row justify-content-center mb-5">
      <div class="col-lg-8">
        <div class="search-form">
          <form class="search-wrapper">
            <div class="input-group input-group-lg">
              <div class="input-group-prepend">
                <span class="input-group-text {{#if useDarkTheme}}bg-secondary border-secondary{{else}}bg-light{{/if}}">
                  <i class="material-icons responsive-icon">search</i>
                </span>
              </div>
              <input type="text" class="form-control {{#if useDarkTheme}}bg-secondary text-light{{/if}}" placeholder="{{searchPlaceholder}}" aria-label="Search">
              {{#if showAdvancedSearch}}
              <div class="input-group-append">
                <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <i class="material-icons responsive-icon">tune</i>
                </button>
                <div class="dropdown-menu dropdown-menu-right">
                  <h6 class="dropdown-header">Advanced Filters</h6>
                  <div class="dropdown-divider"></div>
                  <div class="px-3 py-2">
                    <div class="form-group mb-2">
                      <label class="form-label small">Category</label>
                      <select class="form-control form-control-sm">
                        <option>All Categories</option>
                        <option>Documents</option>
                        <option>Images</option>
                        <option>Videos</option>
                      </select>
                    </div>
                    <div class="form-group mb-2">
                      <label class="form-label small">Date Range</label>
                      <select class="form-control form-control-sm">
                        <option>Any time</option>
                        <option>Last 24 hours</option>
                        <option>Last week</option>
                        <option>Last month</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              {{/if}}
              <div class="input-group-append">
                <button class="btn btn-primary" type="submit">
                  <i class="material-icons responsive-icon mr-2">search</i>
                  {{searchButtonText}}
                </button>
              </div>
            </div>
          </form>
          {{#if showSuggestions}}
          <div class="search-suggestions mt-2">
            <small class="text-muted">Popular searches: </small>
            {{#each suggestions}}
            <span class="badge badge-pill badge-{{#if ../useDarkTheme}}secondary{{else}}light{{/if}} mr-1">
              <a href="#" class="{{#if ../useDarkTheme}}text-light{{else}}text-dark{{/if}} text-decoration-none">{{this}}</a>
            </span>
            {{/each}}
          </div>
          {{/if}}
        </div>
      </div>
    </div>

    {{#if showResults}}
    <!-- Search Results -->
    <div class="row">
      <div class="col-12">
        <div class="search-results">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">{{resultsTitle}} <span class="text-muted">({{resultCount}} results)</span></h5>
            <div class="search-filters">
              <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-secondary active">All</button>
                <button type="button" class="btn btn-outline-secondary">Documents</button>
                <button type="button" class="btn btn-outline-secondary">Images</button>
                <button type="button" class="btn btn-outline-secondary">Videos</button>
              </div>
            </div>
          </div>
          
          {{#each searchResults}}
          <div class="search-result-item {{#if ../useDarkTheme}}bg-secondary{{else}}border-bottom{{/if}} py-3">
            <div class="row align-items-center">
              {{#if showThumbnail}}
              <div class="col-md-2">
                <img src="{{thumbnail}}" alt="{{title}}" class="img-fluid rounded">
              </div>
              {{/if}}
              <div class="col-md-{{#if showThumbnail}}10{{else}}12{{/if}}">
                <h6 class="mb-1">
                  <a href="{{url}}" class="{{#if ../useDarkTheme}}text-light{{else}}text-primary{{/if}}">{{title}}</a>
                  {{#if type}}
                  <span class="badge badge-{{badgeColor}} ml-2">{{type}}</span>
                  {{/if}}
                </h6>
                <p class="text-muted mb-1">{{description}}</p>
                <div class="d-flex align-items-center text-muted small">
                  <i class="material-icons responsive-icon mr-1" style="font-size: 16px;">schedule</i>
                  <span class="mr-3">{{date}}</span>
                  {{#if author}}
                  <i class="material-icons responsive-icon mr-1" style="font-size: 16px;">person</i>
                  <span class="mr-3">{{author}}</span>
                  {{/if}}
                  {{#if category}}
                  <i class="material-icons responsive-icon mr-1" style="font-size: 16px;">label</i>
                  <span>{{category}}</span>
                  {{/if}}
                </div>
              </div>
            </div>
          </div>
          {{/each}}
          
          <!-- Pagination -->
          <nav aria-label="Search results pagination" class="mt-4">
            <ul class="pagination justify-content-center">
              <li class="page-item disabled">
                <span class="page-link">
                  <i class="material-icons responsive-icon">chevron_left</i>
                </span>
              </li>
              <li class="page-item active"><a class="page-link" href="#">1</a></li>
              <li class="page-item"><a class="page-link" href="#">2</a></li>
              <li class="page-item"><a class="page-link" href="#">3</a></li>
              <li class="page-item"><a class="page-link" href="#">...</a></li>
              <li class="page-item"><a class="page-link" href="#">10</a></li>
              <li class="page-item">
                <a class="page-link" href="#">
                  <i class="material-icons responsive-icon">chevron_right</i>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
    {{/if}}
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Search Explorer Block',
  previewImageUrl: 'https://i.imgur.com/search-explorer.png',
  category: 'search',
  defaultData: {
    sectionTitle: "Advanced Search",
    sectionSubtitle: "Find exactly what you're looking for with our powerful search engine.",
    searchPlaceholder: "Search for documents, images, videos...",
    searchButtonText: "Search",
    showAdvancedSearch: true,
    showSuggestions: true,
    suggestions: ["blockchain", "cryptocurrency", "smart contracts", "DeFi", "NFT"],
    showResults: true,
    resultsTitle: "Search Results",
    resultCount: "1,247",
    searchResults: [
      {
        title: "Introduction to Blockchain Technology",
        description: "A comprehensive guide covering the fundamentals of blockchain technology, including consensus mechanisms, cryptographic hashing, and decentralized networks.",
        url: "#",
        type: "Document",
        badgeColor: "primary",
        date: "2024-01-15",
        author: "John Smith",
        category: "Technology",
        showThumbnail: true,
        thumbnail: "https://via.placeholder.com/120x80"
      },
      {
        title: "Smart Contract Development Best Practices",
        description: "Learn the essential best practices for developing secure and efficient smart contracts on various blockchain platforms.",
        url: "#",
        type: "Tutorial",
        badgeColor: "success",
        date: "2024-01-12",
        author: "Sarah Johnson",
        category: "Development",
        showThumbnail: true,
        thumbnail: "https://via.placeholder.com/120x80"
      },
      {
        title: "DeFi Protocol Analysis",
        description: "Deep dive into decentralized finance protocols, yield farming strategies, and risk assessment in the DeFi ecosystem.",
        url: "#",
        type: "Analysis",
        badgeColor: "info",
        date: "2024-01-10",
        author: "Mike Davis",
        category: "Finance",
        showThumbnail: true,
        thumbnail: "https://via.placeholder.com/120x80"
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
    searchPlaceholder: {
      type: "string",
      name: 'Search Placeholder',
    },
    searchButtonText: {
      type: "string",
      name: 'Search Button Text',
    },
    showAdvancedSearch: {
      type: "boolean",
      name: 'Show Advanced Search',
    },
    showSuggestions: {
      type: "boolean",
      name: 'Show Search Suggestions',
    },
    showResults: {
      type: "boolean",
      name: 'Show Search Results',
    },
    resultsTitle: {
      type: "string",
      name: 'Results Title',
    },
    resultCount: {
      type: "string",
      name: 'Result Count',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;