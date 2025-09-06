const hbs = "<div id=\"{{div_id_4}}\">\n        <div class=\"{{div_class_0}}\"></div> \n        <div class=\"{{div_class_1}}\"></div> \n        <div class=\"{{div_class_2}}\"></div> \n        <div class=\"{{div_class_3}}\"></div> \n      </div>\n      <!-- Preloader - End -->";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;div id="{{div_id_4}}"&gt;
        &lt;div class="{{div_class_0}}"&gt;&lt;/div&gt; 
        &lt;div class="{{div_class_1}}"&gt;&lt;/div&gt; 
        &lt;div class="{{div_class_2}}"&gt;&lt;/div&gt; 
        &lt;div class="{{div_class_3}}"&gt;&lt;/div&gt; 
      &lt;/div&gt;
      &lt;!-- Preloader - End --&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_pepecoin - preloader",
  previewImageUrl,
  category: "header",
  defaultData: {
    "div_class_0": "line-1",
    "div_class_1": "line-2",
    "div_class_2": "line-3",
    "div_class_3": "line-4",
    "div_id_4": "preloader"
},
  config: {
    "div_class_0": {
        "type": "string",
        "name": "div_class_0"
    },
    "div_class_1": {
        "type": "string",
        "name": "div_class_1"
    },
    "div_class_2": {
        "type": "string",
        "name": "div_class_2"
    },
    "div_class_3": {
        "type": "string",
        "name": "div_class_3"
    },
    "div_id_4": {
        "type": "string",
        "name": "div_id_4"
    }
}
};

export default block;