const hbs = `
<nav class="navbar navbar-expand-lg navbar-light {{#if useDarkTheme}}navbar-dark bg-dark{{else}}bg-light{{/if}}">
  <a class="navbar-brand" href="#">{{brand}}</a>
  <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbar" aria-controls="navbar" aria-expanded="false" aria-label="Toggle navigation">
    <span class="navbar-toggler-icon"></span>
  </button>

  <div class="collapse navbar-collapse" id="navbar">
    <ul class="navbar-nav mr-auto">
      <li class="nav-item active">
        <a class="nav-link" href="#">{{link1}}
          <span class="sr-only">(current)</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#">{{link2}}</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#">{{link3}}</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#">{{link4}}</a>
      </li>
    </ul>
    {{#if showSearch}}
    <form class="form-inline my-2 my-lg-0">
      <input class="form-control mr-sm-2" type="text" placeholder="Search">
      <button class="btn btn-secondary my-2 my-sm-0" type="submit">Search</button>
    </form>
    {{/if}}
  </div>
</nav>
`;

const block = {
  hbs,
  name: 'Navbar #1',
  previewImageUrl: 'https://i.imgur.com/awrvf3d.png',
  category: 'header',
  defaultData: {
    brand: "Reynholm",
    link1: "Home",
    link2: "Feature",
    link3: "Pricing",
    link4: "About",
    showSearch: true,
    useDarkTheme: false,
  },
  config: {
    title: {
      type: "string",
      name: 'Brand name',
    },
    link1: {
      type: "string",
      name: 'Link #1',
    },
    link2: {
      type: "string",
      name: 'Link #2',
    },
    link3: {
      type: "string",
      name: 'Link #3',
    },
    link4: {
      type: "string",
      name: 'Link #4',
    },
    showSearch: {
      type: "boolean",
      name: 'Show search',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use dark theme',
    },
  }
};

export default block;
