const hbs = "<li>\n    <a href=\"{{a_href_4}}\">\n        <span class=\"{{span_class_1}}\"><i class=\"{{i_class_0}}\"></i></span>\n        <span class=\"{{span_class_2}}\">{{span_content_2}}</span>\n        <span class=\"{{span_class_3}}\">{{span_content_3}}</span>\n    </a>\n</li>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;li&gt;
    &lt;a href="{{a_href_4}}"&gt;
        &lt;span class="{{span_class_1}}"&gt;&lt;i class="{{i_class_0}}"&gt;&lt;/i&gt;&lt;/span&gt;
        &lt;span class="{{span_class_2}}"&gt;{{span_content_2}}&lt;/span&gt;
        &lt;span class="{{span_class_3}}"&gt;{{span_content_3}}&lt;/span&gt;
    &lt;/a&gt;
&lt;/li&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "global - List link Spans",
  previewImageUrl,
  category: "content",
  defaultData: {
    "i_class_0": "fa-solid fa-arrow-up-right",
    "span_class_1": "icon",
    "span_class_2": "label",
    "span_content_2": "Cybersecurity",
    "span_class_3": "value",
    "span_content_3": "(05)",
    "a_href_4": "#!"
},
  config: {
    "i_class_0": {
        "type": "string",
        "name": "i_class_0"
    },
    "span_class_1": {
        "type": "string",
        "name": "span_class_1"
    },
    "span_class_2": {
        "type": "string",
        "name": "span_class_2"
    },
    "span_content_2": {
        "type": "string",
        "name": "span_content_2"
    },
    "span_class_3": {
        "type": "string",
        "name": "span_class_3"
    },
    "span_content_3": {
        "type": "string",
        "name": "span_content_3"
    },
    "a_href_4": {
        "type": "string",
        "name": "a_href_4"
    }
}
};

export default block;