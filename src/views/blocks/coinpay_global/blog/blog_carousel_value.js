const hbs = "<div class=\"{{div_class_5}}\" style=\"{{div_style_5}}\">\n    <div class=\"{{div_class_4}}\">\n        <div class=\"{{div_class_0}}\">{{div_content_0}}</div>\n        <h3 class=\"{{h3_class_2}}\">\n            <a href=\"{{a_href_1}}\">{{a_content_1}}</a>\n        </h3>\n        <p class=\"{{p_class_3}}\">{{p_content_3}}</p>\n    </div>\n</div>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;div class="{{div_class_5}}" style="{{div_style_5}}"&gt;
    &lt;div class="{{div_class_4}}"&gt;
        &lt;div class="{{div_class_0}}"&gt;{{div_content_0}}&lt;/div&gt;
        &lt;h3 class="{{h3_class_2}}"&gt;
            &lt;a href="{{a_href_1}}"&gt;{{a_content_1}}&lt;/a&gt;
        &lt;/h3&gt;
        &lt;p class="{{p_class_3}}"&gt;{{p_content_3}}&lt;/p&gt;
    &lt;/div&gt;
&lt;/div&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "global - /Blog/Carousel/Value",
  previewImageUrl,
  category: "content",
  defaultData: {
    "div_class_0": "badge",
    "div_content_0": "# ICO Groth",
    "a_href_1": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/blog_details.html",
    "a_content_1": "How Our Unique Tokenomics Ensures Sustainable Growth and Value?",
    "h3_class_2": "blog_post_title",
    "p_class_3": "blog_post_description mb-0",
    "p_content_3": "Our unique tokenomics is designed to ensure sustainable growth and long-term value by balancing token supply and demand, rewarding community participation.",
    "div_class_4": "post_info",
    "div_class_5": "swiper-slide",
    "div_style_5": "background-image: url('https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/blogs/blog_post_image_1.webp');"
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
    "a_href_1": {
        "type": "string",
        "name": "a_href_1"
    },
    "a_content_1": {
        "type": "string",
        "name": "a_content_1"
    },
    "h3_class_2": {
        "type": "string",
        "name": "h3_class_2"
    },
    "p_class_3": {
        "type": "string",
        "name": "p_class_3"
    },
    "p_content_3": {
        "type": "string",
        "name": "p_content_3"
    },
    "div_class_4": {
        "type": "string",
        "name": "div_class_4"
    },
    "div_class_5": {
        "type": "string",
        "name": "div_class_5"
    },
    "div_style_5": {
        "type": "string",
        "name": "div_style_5"
    }
}
};

export default block;