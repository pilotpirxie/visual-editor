const hbs = "<div class=\"{{div_class_6}}\">\n    <div class=\"{{div_class_0}}\">{{div_content_0}}</div>\n    <div class=\"{{div_class_1}}\"></div>\n    <button class=\"{{button_class_3}}\" type=\"{{button_type_3}}\" style=\"{{button_style_3}}\">\n        <i class=\"{{i_class_2}}\"></i>\n    </button>\n    <button class=\"{{button_class_5}}\" type=\"{{button_type_5}}\" style=\"{{button_style_5}}\">\n        <i class=\"{{i_class_4}}\"></i>\n    </button>\n</div>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;div class="{{div_class_6}}"&gt;
    &lt;div class="{{div_class_0}}"&gt;{{div_content_0}}&lt;/div&gt;
    &lt;div class="{{div_class_1}}"&gt;&lt;/div&gt;
    &lt;button class="{{button_class_3}}" type="{{button_type_3}}" style="{{button_style_3}}"&gt;
        &lt;i class="{{i_class_2}}"&gt;&lt;/i&gt;
    &lt;/button&gt;
    &lt;button class="{{button_class_5}}" type="{{button_type_5}}" style="{{button_style_5}}"&gt;
        &lt;i class="{{i_class_4}}"&gt;&lt;/i&gt;
    &lt;/button&gt;
&lt;/div&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_global - /Blog/Carousel",
  previewImageUrl,
  category: "content",
  defaultData: {
    "div_class_0": "swiper-wrapper",
    "div_content_0": "{{{content}}}",
    "div_class_1": "bc-pagination",
    "i_class_2": "fa-solid fa-angles-left",
    "button_class_3": "bc-button-prev",
    "button_type_3": "button",
    "button_style_3": "background-image: url('https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_left.svg');",
    "i_class_4": "fa-solid fa-angles-right",
    "button_class_5": "bc-button-next",
    "button_type_5": "button",
    "button_style_5": "background-image: url('https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_right.svg');",
    "div_class_6": "blog_carousel_block swiper"
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
    "div_class_1": {
        "type": "string",
        "name": "div_class_1"
    },
    "i_class_2": {
        "type": "string",
        "name": "i_class_2"
    },
    "button_class_3": {
        "type": "string",
        "name": "button_class_3"
    },
    "button_type_3": {
        "type": "string",
        "name": "button_type_3"
    },
    "button_style_3": {
        "type": "string",
        "name": "button_style_3"
    },
    "i_class_4": {
        "type": "string",
        "name": "i_class_4"
    },
    "button_class_5": {
        "type": "string",
        "name": "button_class_5"
    },
    "button_type_5": {
        "type": "string",
        "name": "button_type_5"
    },
    "button_style_5": {
        "type": "string",
        "name": "button_style_5"
    },
    "div_class_6": {
        "type": "string",
        "name": "div_class_6"
    }
}
};

export default block;