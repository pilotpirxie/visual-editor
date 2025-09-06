const hbs = "<section id=\"{{section_id_23}}\" class=\"{{section_class_23}}\">\n          <div class=\"{{div_class_18}}\">\n            <div class=\"{{div_class_17}}\">\n              <div class=\"{{div_class_16}}\">\n                <div class=\"{{div_class_15}}\">\n                  <div class=\"{{div_class_6}}\">\n                    <h2 class=\"{{h2_class_4}}\" data-aos=\"{{h2_data-aos_4}}\" data-aos-duration=\"{{h2_data-aos-duration_4}}\">\n                      <span class=\"{{span_class_1}}\">\n                        <img src=\"{{img_src_0}}\" alt=\"{{img_alt_0}}\">\n                      </span>{{h2_content_4}}<span class=\"{{span_class_3}}\">\n                        <img src=\"{{img_src_2}}\" alt=\"{{img_alt_2}}\">\n                      </span>\n                    </h2>\n                    <p class=\"{{p_class_5}}\" data-aos=\"{{p_data-aos_5}}\" data-aos-duration=\"{{p_data-aos-duration_5}}\" data-aos-delay=\"{{p_data-aos-delay_5}}\">{{p_content_5}}</p>\n                  </div>\n                  <div class=\"{{div_class_8}}\">\n                    <img src=\"{{img_src_7}}\" alt=\"{{img_alt_7}}\">\n                  </div>\n                  <div class=\"{{div_class_10}}\" data-aos=\"{{div_data-aos_10}}\" data-aos-duration=\"{{div_data-aos-duration_10}}\" data-aos-delay=\"{{div_data-aos-delay_10}}\">\n                    <img src=\"{{img_src_9}}\" alt=\"{{img_alt_9}}\">\n                  </div>\n                  <div class=\"{{div_class_12}}\">\n                    <img src=\"{{img_src_11}}\" alt=\"{{img_alt_11}}\">\n                  </div>\n                  <div class=\"{{div_class_14}}\">\n                    <img src=\"{{img_src_13}}\" alt=\"{{img_alt_13}}\">\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n          <div class=\"{{div_class_20}}\">\n            <img src=\"{{img_src_19}}\" alt=\"{{img_alt_19}}\">\n          </div>\n          <div class=\"{{div_class_22}}\">\n            <img src=\"{{img_src_21}}\" alt=\"{{img_alt_21}}\">\n          </div>\n        </section>";

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="10" y="10" width="380" height="180">
    <pre xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:12px; font-family:monospace; color:black; white-space:pre-wrap;">
&lt;section id="{{section_id_23}}" class="{{section_class_23}}"&gt;
          &lt;div class="{{div_class_18}}"&gt;
            &lt;div class="{{div_class_17}}"&gt;
              &lt;div class="{{div_class_16}}"&gt;
                &lt;div class="{{div_class_15}}"&gt;
                  &lt;div class="{{div_class_6}}"&gt;
                    &lt;h2 class="{{h2_class_4}}" data-aos="{{h2_data-aos_4}}" data-aos-duration="{{h2_data-aos-duration_4}}"&gt;
                      &lt;span class="{{span_class_1}}"&gt;
                        &lt;img src="{{img_src_0}}" alt="{{img_alt_0}}"&gt;
                      &lt;/span&gt;{{h2_content_4}}&lt;span class="{{span_class_3}}"&gt;
                        &lt;img src="{{img_src_2}}" alt="{{img_alt_2}}"&gt;
                      &lt;/span&gt;
                    &lt;/h2&gt;
                    &lt;p class="{{p_class_5}}" data-aos="{{p_data-aos_5}}" data-aos-duration="{{p_data-aos-duration_5}}" data-aos-delay="{{p_data-aos-delay_5}}"&gt;{{p_content_5}}&lt;/p&gt;
                  &lt;/div&gt;
                  &lt;div class="{{div_class_8}}"&gt;
                    &lt;img src="{{img_src_7}}" alt="{{img_alt_7}}"&gt;
                  &lt;/div&gt;
                  &lt;div class="{{div_class_10}}" data-aos="{{div_data-aos_10}}" data-aos-duration="{{div_data-aos-duration_10}}" data-aos-delay="{{div_data-aos-delay_10}}"&gt;
                    &lt;img src="{{img_src_9}}" alt="{{img_alt_9}}"&gt;
                  &lt;/div&gt;
                  &lt;div class="{{div_class_12}}"&gt;
                    &lt;img src="{{img_src_11}}" alt="{{img_alt_11}}"&gt;
                  &lt;/div&gt;
                  &lt;div class="{{div_class_14}}"&gt;
                    &lt;img src="{{img_src_13}}" alt="{{img_alt_13}}"&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_20}}"&gt;
            &lt;img src="{{img_src_19}}" alt="{{img_alt_19}}"&gt;
          &lt;/div&gt;
          &lt;div class="{{div_class_22}}"&gt;
            &lt;img src="{{img_src_21}}" alt="{{img_alt_21}}"&gt;
          &lt;/div&gt;
        &lt;/section&gt;
    </pre>
  </foreignObject>
</svg>`;

const previewImageUrl = "data:image/svg+xml;base64," + Buffer.from(svgText).toString("base64");

const block = {
  hbs,
  name: "coinpay_pepecoin - /Home/Main/About",
  previewImageUrl,
  category: "content",
  defaultData: {
    "img_src_0": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_dot.png",
    "img_alt_0": "Dot",
    "span_class_1": "shape_dot",
    "img_src_2": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_dot.png",
    "img_alt_2": "Dot",
    "span_class_3": "shape_dot",
    "h2_class_4": "heading_text text-uppercase",
    "h2_data-aos_4": "fade-up",
    "h2_data-aos-duration_4": "800",
    "h2_content_4": "About $Pepe",
    "p_class_5": "heading_description mb-0",
    "p_data-aos_5": "fade-up",
    "p_data-aos-duration_5": "800",
    "p_data-aos-delay_5": "100",
    "p_content_5": "Pepe is done watching the endless stream of derivative Inu coins. It’s time for the internet’s most iconic meme to reclaim the throne. $PEPE is here to make memecoins great again: stealth-launched, no presale, zero taxes, LP burnt, and contract renounced. Fueled by pure meme power, $PEPE is a coin for the people—forever.",
    "div_class_6": "pepecoin_heading_block",
    "img_src_7": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_sign_board.webp",
    "img_alt_7": "Board Image",
    "div_class_8": "shape_board_image",
    "img_src_9": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_dragonfly.png",
    "img_alt_9": "Dragonfly",
    "div_class_10": "shape_dragonfly",
    "div_data-aos_10": "fade-right",
    "div_data-aos-duration_10": "800",
    "div_data-aos-delay_10": "100",
    "img_src_11": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_9.webp",
    "img_alt_11": "Tree Wood",
    "div_class_12": "shape_wood_1",
    "img_src_13": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cartoon_10.webp",
    "img_alt_13": "Tree Wood",
    "div_class_14": "shape_wood_2",
    "div_class_15": "pepecoin_about_content position-relative text-center",
    "div_class_16": "col-lg-9",
    "div_class_17": "row justify-content-end",
    "div_class_18": "container",
    "img_src_19": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_tree_1.webp",
    "img_alt_19": "Tree",
    "div_class_20": "decoration_item shape_tree",
    "img_src_21": "https://react-design-tools.tcp4.me/asset-collection/Coinpay/assets/images/shapes/shape_cloud_2.png",
    "img_alt_21": "Cloud",
    "div_class_22": "decoration_item shape_cloud",
    "section_id_23": "id_pepecoin_about_section",
    "section_class_23": "pepecoin_about_section section_space pb-0 section_decoration mt-lg-5"
},
  config: {
    "img_src_0": {
        "type": "string",
        "name": "img_src_0"
    },
    "img_alt_0": {
        "type": "string",
        "name": "img_alt_0"
    },
    "span_class_1": {
        "type": "string",
        "name": "span_class_1"
    },
    "img_src_2": {
        "type": "string",
        "name": "img_src_2"
    },
    "img_alt_2": {
        "type": "string",
        "name": "img_alt_2"
    },
    "span_class_3": {
        "type": "string",
        "name": "span_class_3"
    },
    "h2_class_4": {
        "type": "string",
        "name": "h2_class_4"
    },
    "h2_data-aos_4": {
        "type": "string",
        "name": "h2_data-aos_4"
    },
    "h2_data-aos-duration_4": {
        "type": "string",
        "name": "h2_data-aos-duration_4"
    },
    "h2_content_4": {
        "type": "string",
        "name": "h2_content_4"
    },
    "p_class_5": {
        "type": "string",
        "name": "p_class_5"
    },
    "p_data-aos_5": {
        "type": "string",
        "name": "p_data-aos_5"
    },
    "p_data-aos-duration_5": {
        "type": "string",
        "name": "p_data-aos-duration_5"
    },
    "p_data-aos-delay_5": {
        "type": "string",
        "name": "p_data-aos-delay_5"
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
    "img_src_9": {
        "type": "string",
        "name": "img_src_9"
    },
    "img_alt_9": {
        "type": "string",
        "name": "img_alt_9"
    },
    "div_class_10": {
        "type": "string",
        "name": "div_class_10"
    },
    "div_data-aos_10": {
        "type": "string",
        "name": "div_data-aos_10"
    },
    "div_data-aos-duration_10": {
        "type": "string",
        "name": "div_data-aos-duration_10"
    },
    "div_data-aos-delay_10": {
        "type": "string",
        "name": "div_data-aos-delay_10"
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
    "div_class_15": {
        "type": "string",
        "name": "div_class_15"
    },
    "div_class_16": {
        "type": "string",
        "name": "div_class_16"
    },
    "div_class_17": {
        "type": "string",
        "name": "div_class_17"
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
    "section_id_23": {
        "type": "string",
        "name": "section_id_23"
    },
    "section_class_23": {
        "type": "string",
        "name": "section_class_23"
    }
}
};

export default block;