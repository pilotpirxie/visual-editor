const hbs = "<section id=\"{{section_id_21}}\" class=\"{{section_class_21}}\">\n          <div class=\"{{div_class_10}}\">\n            <div class=\"{{div_class_1}}\" data-aos=\"{{div_data-aos_1}}\" data-aos-duration=\"{{div_data-aos-duration_1}}\">\n              <h2 class=\"{{h2_class_0}}\">{{h2_content_0}}</h2>\n            </div>\n\n            <div class=\"{{div_class_9}}\">\n              <div class=\"{{div_class_8}}\">\n                <ul class=\"{{ul_class_5}}\">\n                  <li data-aos=\"{{li_data-aos_2}}\" data-aos-duration=\"{{li_data-aos-duration_2}}\" data-aos-delay=\"{{li_data-aos-delay_2}}\">{{li_content_2}}</li>\n                  <li data-aos=\"{{li_data-aos_3}}\" data-aos-duration=\"{{li_data-aos-duration_3}}\" data-aos-delay=\"{{li_data-aos-delay_3}}\">{{li_content_3}}</li>\n                  <li data-aos=\"{{li_data-aos_4}}\" data-aos-duration=\"{{li_data-aos-duration_4}}\" data-aos-delay=\"{{li_data-aos-delay_4}}\">{{li_content_4}}</li>\n                </ul>\n                <div class=\"{{div_class_7}}\">\n                  <img src=\"{{img_src_6}}\" alt=\"{{img_alt_6}}\">\n                </div>\n              </div>\n            </div>\n          </div>\n          <div class=\"{{div_class_12}}\" data-aos=\"{{div_data-aos_12}}\" data-aos-duration=\"{{div_data-aos-duration_12}}\" data-aos-delay=\"{{div_data-aos-delay_12}}\">\n            <img src=\"{{img_src_11}}\" alt=\"{{img_alt_11}}\">\n          </div>\n          <div class=\"{{div_class_14}}\">\n            <img src=\"{{img_src_13}}\" alt=\"{{img_alt_13}}\">\n          </div>\n          <div class=\"{{div_class_16}}\" data-aos=\"{{div_data-aos_16}}\" data-aos-duration=\"{{div_data-aos-duration_16}}\">\n            <img src=\"{{img_src_15}}\" alt=\"{{img_alt_15}}\">\n          </div>\n          <div class=\"{{div_class_18}}\">\n            <img src=\"{{img_src_17}}\" alt=\"{{img_alt_17}}\">\n          </div>\n          <div class=\"{{div_class_20}}\">\n            <img src=\"{{img_src_19}}\" alt=\"{{img_alt_19}}\">\n          </div>\n        </section>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;section id="{{section_id_21}}" class="{{section_class_21}}"&gt;
          &lt;div class="{{div_class_10}}"&gt;
            &lt;div class="{{div_class_1}}" data-aos="{{div_data-aos_1}}" data-aos-duration="{{div_data-aos-duration_1}}"&gt;
              &lt;h2 class="{{h2_class_0}}"&gt;{{h2_content_0}}&lt;/h2&gt;
            &lt;/div&gt;

            &lt;div class="{{div_class_9}}"&gt;
              &lt;div class="{{div_class_8}}"&gt;
                &lt;ul class="{{ul_class_5}}"&gt;
                  &lt;li data-aos="{{li_data-aos_2}}" data-aos-duration="{{li_data-aos-duration_2}}" data-aos-delay="{{li_data-aos-delay_2}}"&gt;{{li_content_2}}&lt;/li&gt;
                  &lt;li data-aos="{{li_data-aos_3}}" data-aos-duration="{{li_data-aos-duration_3}}" data-aos-delay="{{li_data-aos-delay_3}}"&gt;{{li_content_3}}&lt;/li&gt;
                  &lt;li data-aos="{{li_data-aos_4}}" data-aos-duration="{{li_data-aos-duration_4}}" data-aos-delay="{{li_data-aos-delay_4}}"&gt;{{li_content_4}}&lt;/li&gt;
                &lt;/ul&gt;
                &lt;div class="{{div_class_7}}"&gt;
                  &lt;img src="{{img_src_6}}" alt="{{img_alt_6}}"&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_12}}" data-aos="{{div_data-aos_12}}" data-aos-duration="{{div_data-aos-duration_12}}" data-aos-delay="{{div_data-aos-delay_12}}"&gt;
            &lt;img src="{{img_src_11}}" alt="{{img_alt_11}}"&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_14}}"&gt;
            &lt;img src="{{img_src_13}}" alt="{{img_alt_13}}"&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_16}}" data-aos="{{div_data-aos_16}}" data-aos-duration="{{div_data-aos-duration_16}}"&gt;
            &lt;img src="{{img_src_15}}" alt="{{img_alt_15}}"&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_18}}"&gt;
            &lt;img src="{{img_src_17}}" alt="{{img_alt_17}}"&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_20}}"&gt;
            &lt;img src="{{img_src_19}}" alt="{{img_alt_19}}"&gt;
          &lt;/div&gt;
        &lt;/section&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_pepecoin - /Home/Main/Roadmap",
  previewImageUrl,
  category: "content",
  defaultData: {
    "h2_class_0": "heading_text text-uppercase mb-0 text-white",
    "h2_content_0": "Roadmap",
    "div_class_1": "pepecoin_heading_block text-center",
    "div_data-aos_1": "fade-up",
    "div_data-aos-duration_1": "800",
    "li_data-aos_2": "fade-right",
    "li_data-aos-duration_2": "800",
    "li_data-aos-delay_2": "100",
    "li_content_2": "Phase 1: Meme",
    "li_data-aos_3": "fade-left",
    "li_data-aos-duration_3": "800",
    "li_data-aos-delay_3": "200",
    "li_content_3": "Phase 2: Vibe and HODL",
    "li_data-aos_4": "fade-right",
    "li_data-aos-duration_4": "800",
    "li_data-aos-delay_4": "300",
    "li_content_4": "Phase 3: Meme Takeover",
    "ul_class_5": "pepecoin_roadmap_list unordered_list_block text-center text-uppercase",
    "img_src_6": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_sign_board_3.webp",
    "img_alt_6": "Board",
    "div_class_7": "pepecoin_roadmap_image",
    "div_class_8": "col-lg-7 position-relative",
    "div_class_9": "row justify-content-center",
    "div_class_10": "container",
    "img_src_11": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_tree_1.webp",
    "img_alt_11": "Tree",
    "div_class_12": "decoration_item shape_tree",
    "div_data-aos_12": "fade-right",
    "div_data-aos-duration_12": "800",
    "div_data-aos-delay_12": "200",
    "img_src_13": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_stone_2.webp",
    "img_alt_13": "Stone",
    "div_class_14": "decoration_item shape_stone",
    "img_src_15": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_13.webp",
    "img_alt_15": "Stone",
    "div_class_16": "decoration_item shape_cartoon_1",
    "div_data-aos_16": "fade-right",
    "div_data-aos-duration_16": "800",
    "img_src_17": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_9.webp",
    "img_alt_17": "Tree Wood",
    "div_class_18": "decoration_item shape_tree_wood",
    "img_src_19": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_pepecoin_1.webp",
    "img_alt_19": "Pepe Coin Image",
    "div_class_20": "decoration_item pepe_coin_image",
    "section_id_21": "id_pepecoin_roadmap_section",
    "section_class_21": "pepecoin_roadmap_section section_space pb-0 section_decoration"
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
    "li_data-aos_2": {
        "type": "string",
        "name": "li_data-aos_2"
    },
    "li_data-aos-duration_2": {
        "type": "string",
        "name": "li_data-aos-duration_2"
    },
    "li_data-aos-delay_2": {
        "type": "string",
        "name": "li_data-aos-delay_2"
    },
    "li_content_2": {
        "type": "string",
        "name": "li_content_2"
    },
    "li_data-aos_3": {
        "type": "string",
        "name": "li_data-aos_3"
    },
    "li_data-aos-duration_3": {
        "type": "string",
        "name": "li_data-aos-duration_3"
    },
    "li_data-aos-delay_3": {
        "type": "string",
        "name": "li_data-aos-delay_3"
    },
    "li_content_3": {
        "type": "string",
        "name": "li_content_3"
    },
    "li_data-aos_4": {
        "type": "string",
        "name": "li_data-aos_4"
    },
    "li_data-aos-duration_4": {
        "type": "string",
        "name": "li_data-aos-duration_4"
    },
    "li_data-aos-delay_4": {
        "type": "string",
        "name": "li_data-aos-delay_4"
    },
    "li_content_4": {
        "type": "string",
        "name": "li_content_4"
    },
    "ul_class_5": {
        "type": "string",
        "name": "ul_class_5"
    },
    "img_src_6": {
        "type": "string",
        "name": "img_src_6"
    },
    "img_alt_6": {
        "type": "string",
        "name": "img_alt_6"
    },
    "div_class_7": {
        "type": "string",
        "name": "div_class_7"
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
    "div_data-aos_12": {
        "type": "string",
        "name": "div_data-aos_12"
    },
    "div_data-aos-duration_12": {
        "type": "string",
        "name": "div_data-aos-duration_12"
    },
    "div_data-aos-delay_12": {
        "type": "string",
        "name": "div_data-aos-delay_12"
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
    "div_data-aos_16": {
        "type": "string",
        "name": "div_data-aos_16"
    },
    "div_data-aos-duration_16": {
        "type": "string",
        "name": "div_data-aos-duration_16"
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
    "img_src_19": {
        "type": "string",
        "name": "img_src_19"
    },
    "img_alt_19": {
        "type": "string",
        "name": "img_alt_19"
    },
    "div_class_20": {
        "type": "string",
        "name": "div_class_20"
    },
    "section_id_21": {
        "type": "string",
        "name": "section_id_21"
    },
    "section_class_21": {
        "type": "string",
        "name": "section_class_21"
    }
}
};

export default block;