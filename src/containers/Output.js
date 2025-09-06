import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from "react-redux";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import renderHandlebars from '../utils/renderHandlebars';
import hbsToJsx from '../utils/hbsToJsx'; // Import the new utility
import blocks from '../views/blocks'; // Import blocks to get defaultData and config

class Output extends Component {
  constructor(props) {
    super(props);
    this.handleExport = this.handleExport.bind(this);
    this.handleExportToViteJsx = this.handleExportToViteJsx.bind(this); // Bind new function
  }

  handleExport() {
    const zip = new JSZip();
    this.props.pages.forEach(page => {
      const html = renderHandlebars(page.blocks, page.templateId, true, page.name);
      zip.file(`${page.name.replace(/ /g, '_')}.html`, html);
    });

    zip.generateAsync({ type: "blob" })
      .then(function (content) {
        saveAs(content, "website.zip");
      });
  }

  handleExportToViteJsx() {
    const zip = new JSZip();
    const viteProjectName = "built-with-vite";

    // 1. Add Vite boilerplate files
    zip.file(`${viteProjectName}/index.html`, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`);

    zip.file(`${viteProjectName}/package.json`, `{ 
  "name": "${viteProjectName}",
  "private": true,
    "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^5.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.1.2"
  }
}`); // Simplified devDependencies and updated react versions to match current project

    zip.file(`${viteProjectName}/vite.config.js`, `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`);

    zip.file(`${viteProjectName}/src/index.css`, `body { margin: 0; font-family: sans-serif; }
`); // Basic CSS
    zip.file(`${viteProjectName}/src/App.css`, ``); // Empty App.css

    // 2. Prepare src/components and src/pages directories in the zip.
    zip.folder(`${viteProjectName}/src/components`);
    zip.folder(`${viteProjectName}/src/pages`);
    zip.folder(`${viteProjectName}/src/assets`); // For react.svg, vite.svg if needed

    const usedBlockIds = new Set();
    const collectBlocks = (blocksArray) => {
      blocksArray.forEach(b => {
        usedBlockIds.add(b.blockId);
        if (b.children && b.children.length > 0) {
          collectBlocks(b.children);
        }
      });
    };
    this.props.pages.forEach(page => collectBlocks(page.blocks));
    const blockComponentNames = {};
    usedBlockIds.forEach(blockId => {
      const blockConfig = blocks[blockId];
      if (blockConfig?.hbs) {
        const componentName = blockId.charAt(0).toUpperCase() + blockId.slice(1);
        blockComponentNames[blockId] = componentName;

        const dataKeys = Object.keys(blockConfig.defaultData || {});
        const jsxContent = hbsToJsx(blockConfig.hbs, dataKeys);

        const componentString = `import React from 'react';

const ${componentName} = ({ ${dataKeys.join(', ')}, children }) => {
  return (
    <>
      ${jsxContent}
    </>
  );
};

export default ${componentName};
`;
        zip.file(`${viteProjectName}/src/components/${componentName}.jsx`, componentString);
      }
    });

    // Recursive function to generate JSX for a list of blocks
    const generateJsxForBlocks = (blocksArray) => {
      let jsx = '';
      const imports = new Set();

      blocksArray.forEach(layoutBlock => {
        const componentName = blockComponentNames[layoutBlock.blockId];
        if (componentName) {
          imports.add(componentName);
          const props = Object.keys(layoutBlock.data).map(key => `${key}={${JSON.stringify(layoutBlock.data[key])}}`).join(' ');

          if (layoutBlock.children && layoutBlock.children.length > 0) {
            const { jsx: childrenJsx, imports: childrenImports } = generateJsxForBlocks(layoutBlock.children);
            childrenImports.forEach(imp => imports.add(imp));
            jsx += `      <${componentName} ${props}>
${childrenJsx}      </${componentName}>
`;
          } else {
            jsx += `      <${componentName} ${props} />
`;
          }
        } else {
          console.warn(`Block ID ${layoutBlock.blockId} not found in blocks config. Skipping.`);
        }
      });

      return { jsx, imports };
    };

    // 4. Process each page and create JSX page components
    const pageRoutes = [];
    this.props.pages.forEach((page, index) => {
      const pageComponentName = `Page${index + 1}`;
      const pagePath = `/${page.name.replace(/ /g, '-').toLowerCase()}`;
      pageRoutes.push({ path: pagePath, component: pageComponentName });

      const { jsx: pageContentJsx, imports: pageImports } = generateJsxForBlocks(page.blocks);

      const pageComponentString = `import React from 'react';
${Array.from(pageImports).map(comp => `import ${comp} from '../components/${comp}.jsx';`).join('\n')}

const ${pageComponentName} = () => {
  return (
    <div>
${pageContentJsx}
    </div>
  );
};

export default ${pageComponentName};
`;
      zip.file(`${viteProjectName}/src/pages/${pageComponentName}.jsx`, pageComponentString);
    });

    // 5. Generate src/router.jsx
    const routerJsx = `import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
${pageRoutes.map(route => `import ${route.component} from './pages/${route.component}.jsx';`).join('\n')}

const AppRouter = () => {
  return (
    <Router>
      <Switch>
${pageRoutes.map(route => `        <Route path="${route.path}" component={${route.component}} />`).join('\n')}
        <Route path="/" exact component={${pageRoutes[0] ? pageRoutes[0].component : '() => <div>No pages found</div>'}} />
      </Switch>
    </Router>
  );
};

export default AppRouter;
`;
    zip.file(`${viteProjectName}/src/router.jsx`, routerJsx);


    // 6. Generate src/main.jsx
    zip.file(`${viteProjectName}/src/main.jsx`, `import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './router.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
`);

    // 7. Generate src/App.jsx (empty, as router.jsx handles routing)
    zip.file(`${viteProjectName}/src/App.jsx`, `// This file is intentionally left empty as routing is handled by router.jsx
// You can add global components or context providers here if needed.
import React from 'react';

function App() {
  return (
    <div>
      <h1>Welcome to your Site Builder Project!</h1>
      <p>Navigate to your pages using the routes defined in src/router.jsx</p>
    </div>
  );
}

export default App;
`);


    // Trigger download
    zip.generateAsync({ type: "blob" })
      .then(function (content) {
        saveAs(content, `${viteProjectName}.zip`);
      });
  }

  render() {
    if (!this.props.display) return null;

    return (
      <div>
        <div className='d-flex justify-content-between align-items-center'>
          <h5>Export</h5>
        </div>
        <hr />
        <div>
          <button className="btn btn-primary" onClick={this.handleExport}>
            Download HTML ZIP
          </button>
          <button className="btn btn-success ml-2" onClick={this.handleExportToViteJsx}>
            Export to Vite JSX
          </button>
        </div>
        <div style={{ marginTop: '20px' }}>
          <label>Output HTML (Active Page)</label>
          <textarea readOnly className='form-control' rows={10} value={this.props.html}></textarea>
        </div>
      </div>
    );
  }
}

Output.propTypes = {
  display: PropTypes.bool,
  html: PropTypes.string,
  pages: PropTypes.array.isRequired,
};

const mapStateToProps = (state) => ({
  pages: state.layout.pages,
});

export default connect(mapStateToProps)(Output);

