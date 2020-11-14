import handlebars from "handlebars";
import document from "../views/document";
import blocks from "../views/blocks";

function render(layoutBlocks) {
  const innerHTML = layoutBlocks.reduce((acc, layoutBlock) => {
    const tpl = handlebars.compile(blocks[layoutBlock.blockId].component);
    return `${acc}${tpl(layoutBlock.data)}`;
  }, ``);

  return handlebars.compile(document)({
    content: innerHTML
  });
}

export default render;
