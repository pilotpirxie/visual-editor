const hbs = "<section id=\"{{section_id_25}}\" class=\"{{section_class_25}}\">\n          <div class=\"{{div_class_20}}\">\n            <div class=\"{{div_class_1}}\" data-aos=\"{{div_data-aos_1}}\" data-aos-duration=\"{{div_data-aos-duration_1}}\">\n              <h2 class=\"{{h2_class_0}}\">{{h2_content_0}}</h2>\n            </div>\n\n            <div class=\"{{div_class_19}}\" style=\"{{div_style_19}}\">\n              <div class=\"{{div_class_10}}\">\n                <div class=\"{{div_class_6}}\">\n                  <h3 class=\"{{h3_class_2}}\">{{h3_content_2}}</h3>\n                  <div class=\"{{div_class_4}}\">\n                    <span class=\"{{span_class_3}}\" data-count=\"{{span_data-count_3}}\">{{span_content_3}}</span>\n                  </div>\n                  <p class=\"{{p_class_5}}\">{{p_content_5}}</p>\n                </div>\n                <div class=\"{{div_class_9}}\">\n                  <div class=\"{{div_class_8}}\">\n                    <img src=\"{{img_src_7}}\" alt=\"{{img_alt_7}}\">\n                  </div>\n                </div>\n              </div>\n              <div class=\"{{div_class_12}}\">\n                <img src=\"{{img_src_11}}\" alt=\"{{img_alt_11}}\">\n              </div>\n              <div class=\"{{div_class_14}}\">\n                <img src=\"{{img_src_13}}\" alt=\"{{img_alt_13}}\">\n              </div>\n              <div class=\"{{div_class_16}}\">\n                <img src=\"{{img_src_15}}\" alt=\"{{img_alt_15}}\">\n              </div>\n              <div class=\"{{div_class_18}}\">\n                <img src=\"{{img_src_17}}\" alt=\"{{img_alt_17}}\">\n              </div>\n            </div>\n          </div>\n          <div class=\"{{div_class_22}}\">\n            <img src=\"{{img_src_21}}\" alt=\"{{img_alt_21}}\">\n          </div>\n          <div class=\"{{div_class_24}}\">\n            <img src=\"{{img_src_23}}\" alt=\"{{img_alt_23}}\">\n          </div>\n        </section>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;section id="{{section_id_25}}" class="{{section_class_25}}"&gt;
          &lt;div class="{{div_class_20}}"&gt;
            &lt;div class="{{div_class_1}}" data-aos="{{div_data-aos_1}}" data-aos-duration="{{div_data-aos-duration_1}}"&gt;
              &lt;h2 class="{{h2_class_0}}"&gt;{{h2_content_0}}&lt;/h2&gt;
            &lt;/div&gt;

            &lt;div class="{{div_class_19}}" style="{{div_style_19}}"&gt;
              &lt;div class="{{div_class_10}}"&gt;
                &lt;div class="{{div_class_6}}"&gt;
                  &lt;h3 class="{{h3_class_2}}"&gt;{{h3_content_2}}&lt;/h3&gt;
                  &lt;div class="{{div_class_4}}"&gt;
                    &lt;span class="{{span_class_3}}" data-count="{{span_data-count_3}}"&gt;{{span_content_3}}&lt;/span&gt;
                  &lt;/div&gt;
                  &lt;p class="{{p_class_5}}"&gt;{{p_content_5}}&lt;/p&gt;
                &lt;/div&gt;
                &lt;div class="{{div_class_9}}"&gt;
                  &lt;div class="{{div_class_8}}"&gt;
                    &lt;img src="{{img_src_7}}" alt="{{img_alt_7}}"&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
              &lt;div class="{{div_class_12}}"&gt;
                &lt;img src="{{img_src_11}}" alt="{{img_alt_11}}"&gt;
              &lt;/div&gt;
              &lt;div class="{{div_class_14}}"&gt;
                &lt;img src="{{img_src_13}}" alt="{{img_alt_13}}"&gt;
              &lt;/div&gt;
              &lt;div class="{{div_class_16}}"&gt;
                &lt;img src="{{img_src_15}}" alt="{{img_alt_15}}"&gt;
              &lt;/div&gt;
              &lt;div class="{{div_class_18}}"&gt;
                &lt;img src="{{img_src_17}}" alt="{{img_alt_17}}"&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_22}}"&gt;
            &lt;img src="{{img_src_21}}" alt="{{img_alt_21}}"&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_24}}"&gt;
            &lt;img src="{{img_src_23}}" alt="{{img_alt_23}}"&gt;
          &lt;/div&gt;
        &lt;/section&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_pepecoin - /Home/Main/Tokenomics",
  previewImageUrl,
  category: "content",
  defaultData: {
    "h2_class_0": "heading_text text-uppercase mb-0",
    "h2_content_0": "Tokenomics",
    "div_class_1": "pepecoin_heading_block text-center mt-lg-5",
    "div_data-aos_1": "fade-up",
    "div_data-aos-duration_1": "800",
    "h3_class_2": "heading_text",
    "h3_content_2": "Token Supply:",
    "span_class_3": "odometer text-primary",
    "span_data-count_3": "420690000000000",
    "span_content_3": "0",
    "div_class_4": "token_supply_value",
    "p_class_5": "mb-0",
    "p_content_5": "No Taxes, No Bullshit. It’s that simple. LP tokens are burnt, and contract ownership is renounced.",
    "div_class_6": "col-lg-7",
    "img_src_7": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_12.webp",
    "img_alt_7": "Frog Image",
    "div_class_8": "image_block",
    "div_class_9": "col-lg-5",
    "div_class_10": "row align-items-center",
    "img_src_11": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_9.webp",
    "img_alt_11": "Tree Wood",
    "div_class_12": "shape_tree_wood_1",
    "img_src_13": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_9.webp",
    "img_alt_13": "Tree Wood",
    "div_class_14": "shape_tree_wood_2",
    "img_src_15": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_9.webp",
    "img_alt_15": "Tree Wood",
    "div_class_16": "shape_tree_wood_3",
    "img_src_17": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_9.webp",
    "img_alt_17": "Tree Wood",
    "div_class_18": "shape_tree_wood_4",
    "div_class_19": "pepecoin_token_supply",
    "div_style_19": "background-image: url('https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_sign_board_2.webp');",
    "div_class_20": "container",
    "img_src_21": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_circle_9.svg",
    "img_alt_21": "Shadow",
    "div_class_22": "decoration_item shape_shadow",
    "img_src_23": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_grash_1.webp",
    "img_alt_23": "Grash",
    "div_class_24": "decoration_item shape_grash",
    "section_id_25": "id_pepecoin_tokenomics_section",
    "section_class_25": "pepecoin_tokenomics_section section_space section_decoration bg-white overflow-hidden"
},
  config: {
    "h2_class_0": {
        "type": "string",
        "name": "h2_class_0"
    },
    "h2_content_0": {
        "type": "string",
        "name": "h2_content_0"
    },
    "div_class_1": {
        "type": "string",
        "name": "div_class_1"
    },
    "div_data-aos_1": {
        "type": "string",
        "name": "div_data-aos_1"
    },
    "div_data-aos-duration_1": {
        "type": "string",
        "name": "div_data-aos-duration_1"
    },
    "h3_class_2": {
        "type": "string",
        "name": "h3_class_2"
    },
    "h3_content_2": {
        "type": "string",
        "name": "h3_content_2"
    },
    "span_class_3": {
        "type": "string",
        "name": "span_class_3"
    },
    "span_data-count_3": {
        "type": "string",
        "name": "span_data-count_3"
    },
    "span_content_3": {
        "type": "string",
        "name": "span_content_3"
    },
    "div_class_4": {
        "type": "string",
        "name": "div_class_4"
    },
    "p_class_5": {
        "type": "string",
        "name": "p_class_5"
    },
    "p_content_5": {
        "type": "string",
        "name": "p_content_5"
    },
    "div_class_6": {
        "type": "string",
        "name": "div_class_6"
    },
    "img_src_7": {
        "type": "string",
        "name": "img_src_7"
    },
    "img_alt_7": {
        "type": "string",
        "name": "img_alt_7"
    },
    "div_class_8": {
        "type": "string",
        "name": "div_class_8"
    },
    "div_class_9": {
        "type": "string",
        "name": "div_class_9"
    },
    "div_class_10": {
        "type": "string",
        "name": "div_class_10"
    },
    "img_src_11": {
        "type": "string",
        "name": "img_src_11"
    },
    "img_alt_11": {
        "type": "string",
        "name": "img_alt_11"
    },
    "div_class_12": {
        "type": "string",
        "name": "div_class_12"
    },
    "img_src_13": {
        "type": "string",
        "name": "img_src_13"
    },
    "img_alt_13": {
        "type": "string",
        "name": "img_alt_13"
    },
    "div_class_14": {
        "type": "string",
        "name": "div_class_14"
    },
    "img_src_15": {
        "type": "string",
        "name": "img_src_15"
    },
    "img_alt_15": {
        "type": "string",
        "name": "img_alt_15"
    },
    "div_class_16": {
        "type": "string",
        "name": "div_class_16"
    },
    "img_src_17": {
        "type": "string",
        "name": "img_src_17"
    },
    "img_alt_17": {
        "type": "string",
        "name": "img_alt_17"
    },
    "div_class_18": {
        "type": "string",
        "name": "div_class_18"
    },
    "div_class_19": {
        "type": "string",
        "name": "div_class_19"
    },
    "div_style_19": {
        "type": "string",
        "name": "div_style_19"
    },
    "div_class_20": {
        "type": "string",
        "name": "div_class_20"
    },
    "img_src_21": {
        "type": "string",
        "name": "img_src_21"
    },
    "img_alt_21": {
        "type": "string",
        "name": "img_alt_21"
    },
    "div_class_22": {
        "type": "string",
        "name": "div_class_22"
    },
    "img_src_23": {
        "type": "string",
        "name": "img_src_23"
    },
    "img_alt_23": {
        "type": "string",
        "name": "img_alt_23"
    },
    "div_class_24": {
        "type": "string",
        "name": "div_class_24"
    },
    "section_id_25": {
        "type": "string",
        "name": "section_id_25"
    },
    "section_class_25": {
        "type": "string",
        "name": "section_class_25"
    }
}
};

export default block;