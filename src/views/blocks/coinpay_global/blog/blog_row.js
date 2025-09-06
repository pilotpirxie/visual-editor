const hbs = "<div class=\"{{div_class_0}}\">{{div_content_0}}</div>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;div class="{{div_class_0}}"&gt;{{div_content_0}}&lt;/div&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_global - /Blog/Row",
  previewImageUrl,
  category: "content",
  defaultData: {
    "div_class_0": "row justify-content-lg-between",
    "div_content_0": "{{{content}}}"
},
  config: {
    "div_class_0": {
        "type": "string",
        "name": "div_class_0"
    },
    "div_content_0": {
        "type": "string",
        "name": "div_content_0"
    }
}
};

export default block;