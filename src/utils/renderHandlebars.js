import handlebars from "handlebars";
import document from "../views/document";
import section from "../views/section";
import blocks from "../views/blocks";

function render(layoutBlocks) {
  const innerHTML = layoutBlocks.reduce((acc, layoutBlock) => {
    const blockHbs = blocks[layoutBlock.blockId].hbs;
    const blockTemplate = handlebars.compile(blockHbs);
    const blockHTML = blockTemplate(layoutBlock.data);

    const sectionTemplate = handlebars.compile(section);
    const sectionHTML = sectionTemplate({
      content: blockHTML,
      uuid: layoutBlock.uuid
    });

    return `${acc}${sectionHTML}`;
  }, ``);

  return handlebars.compile(document)({
    content: innerHTML
  });
}

export default render;
