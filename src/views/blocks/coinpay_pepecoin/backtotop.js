const hbs = "<div class=\"{{div_class_2}}\">\n        <a href=\"{{a_href_1}}\" class=\"{{a_class_1}}\">\n          <i class=\"{{i_class_0}}\"></i>\n        </a>\n      </div>\n      <!-- Back To Top - End -->";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;div class="{{div_class_2}}"&gt;
        &lt;a href="{{a_href_1}}" class="{{a_class_1}}"&gt;
          &lt;i class="{{i_class_0}}"&gt;&lt;/i&gt;
        &lt;/a&gt;
      &lt;/div&gt;
      &lt;!-- Back To Top - End --&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_pepecoin - /Home/Back to Top",
  previewImageUrl,
  category: "header",
  defaultData: {
    "i_class_0": "fa-solid fa-arrow-up",
    "a_href_1": "#",
    "a_class_1": "scroll",
    "div_class_2": "backtotop"
},
  config: {
    "i_class_0": {
        "type": "string",
        "name": "i_class_0"
    },
    "a_href_1": {
        "type": "string",
        "name": "a_href_1"
    },
    "a_class_1": {
        "type": "string",
        "name": "a_class_1"
    },
    "div_class_2": {
        "type": "string",
        "name": "div_class_2"
    }
}
};

export default block;