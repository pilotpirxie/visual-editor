const hbs = "<div class=\"{{div_class_2}}\">\n    <h3 class=\"{{h3_class_0}}\">{{h3_content_0}}</h3>\n    <ul class=\"{{ul_class_1}}\">\n        {{{content}}}\n    </ul>\n</div>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;div class="{{div_class_2}}"&gt;
    &lt;h3 class="{{h3_class_0}}"&gt;{{h3_content_0}}&lt;/h3&gt;
    &lt;ul class="{{ul_class_1}}"&gt;
        {{{content}}}
    &lt;/ul&gt;
&lt;/div&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_global - Sidebar Categories",
  previewImageUrl,
  category: "content",
  defaultData: {
    "h3_class_0": "sidebar_title",
    "h3_content_0": "Categories",
    "ul_class_1": "category_list_block unordered_list_block",
    "div_class_2": "sidebar_category_list"
},
  config: {
    "h3_class_0": {
        "type": "string",
        "name": "h3_class_0"
    },
    "h3_content_0": {
        "type": "string",
        "name": "h3_content_0"
    },
    "ul_class_1": {
        "type": "string",
        "name": "ul_class_1"
    },
    "div_class_2": {
        "type": "string",
        "name": "div_class_2"
    }
}
};

export default block;