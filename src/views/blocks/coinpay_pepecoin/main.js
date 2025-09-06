const hbs = "<main class=\"rcontent-area {{main_class_0}}\">\n    {{{content}}}\n</main>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;main class="{{main_class_0}}"&gt;
    {{{content}}}
&lt;/main&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_pepecoin - /Home/Main",
  previewImageUrl,
  category: "content",
  defaultData: {
    "main_class_0": "page_content"
},
  config: {
    "main_class_0": {
        "type": "string",
        "name": "main_class_0"
    }
}
};

export default block;