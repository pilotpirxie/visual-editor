import handlebars from "handlebars";
import documents from "../views/documents";
import section from "../views/section";
import blocks from "../views/blocks";

function renderBlocks(layoutBlocks, depth = 0) {
  if (!Array.isArray(layoutBlocks)) {
    return '';
  }

  return layoutBlocks.reduce((acc, layoutBlock) => {
    const blockConfig = blocks[layoutBlock.blockId];

    if (!blockConfig || !blockConfig.hbs) {
      console.error(`Block with id "${layoutBlock.blockId}" not found or is missing hbs template. Skipping.`);
      return acc;
    }

    // Prepare data for the template
    const templateData = {
      ...layoutBlock.data,
      // If this block has children, render them first
      content: layoutBlock.children ? renderBlocks(layoutBlock.children, depth + 1) : ''
    };

    // Compile and render block template
    const blockHbs = blockConfig.hbs;
    const blockTemplate = handlebars.compile(blockHbs);
    const blockHTML = blockTemplate(templateData);

    // Wrap every block with a section for drag-and-drop
    const sectionTemplate = handlebars.compile(section);
    const sectionHTML = sectionTemplate({
      content: blockHTML,
      uuid: layoutBlock.uuid
    });
    return `${acc}${sectionHTML}`;
  }, '');
}

function render(layoutBlocks, documentId, isExport = false, name = "Exported Page") {
  const innerHTML = renderBlocks(layoutBlocks);

  const documentConfig = documents[documentId];
  if (!documentConfig || !documentConfig.hbs) {
    console.error(`Document with id "${documentId}" not found or is missing hbs template.`);
    return 'Error: Document template not found.';
  }

  return handlebars.compile(documentConfig.hbs)({
    content: innerHTML,
    is_export: isExport,
    title: isExport ? name : undefined
  });
}

export default render;
