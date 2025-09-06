const hbs = "<li><a href=\"{{a_href_0}}\">{{a_content_0}}</a></li>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;li&gt;&lt;a href="{{a_href_0}}"&gt;{{a_content_0}}&lt;/a&gt;&lt;/li&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "global - List link",
  previewImageUrl,
  category: "content",
  defaultData: {
    "a_href_0": "#!",
    "a_content_0": "Blockchain"
},
  config: {
    "a_href_0": {
        "type": "string",
        "name": "a_href_0"
    },
    "a_content_0": {
        "type": "string",
        "name": "a_content_0"
    }
}
};

export default block;