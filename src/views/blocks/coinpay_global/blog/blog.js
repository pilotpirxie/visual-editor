const hbs = "<section class=\"{{section_class_1}}\">\n    <div class=\"{{div_class_0}}\">{{div_content_0}}</div>\n</section>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;section class="{{section_class_1}}"&gt;
    &lt;div class="{{div_class_0}}"&gt;{{div_content_0}}&lt;/div&gt;
&lt;/section&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_global - /Blog",
  previewImageUrl,
  category: "content",
  defaultData: {
    "div_class_0": "container",
    "div_content_0": "{{{content}}}",
    "section_class_1": "blog_section section_space pt-0"
},
  config: {
    "div_class_0": {
        "type": "string",
        "name": "div_class_0"
    },
    "div_content_0": {
        "type": "string",
        "name": "div_content_0"
    },
    "section_class_1": {
        "type": "string",
        "name": "section_class_1"
    }
}
};

export default block;