import handlebars from "handlebars";
import document from "../views/document";
import blocks from "../views/blocks";

function render(layoutBlocks) {
  const innerHTML = layoutBlocks.reduce((acc, curr) => {
    const tpl = handlebars.compile(blocks[curr.cid].component);
    return `${acc}${tpl(curr.data)}`;
  }, ``);

  return handlebars.compile(document)({
    content: innerHTML
  });
}

export default render;
