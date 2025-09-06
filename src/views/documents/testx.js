const document = {
  hbs: `<!doctype html>
<html lang="en">
  <head>
    <title>{{#if title}}{{title}}{{else}}Hello, world!{{/if}}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="thumbnail" content="assets/images/ico_template_thumbnail.webp">
    <meta name="description" content="Coinpay - Site Template">
    <meta name="keywords" content="Crypto Currency Bootstrap Site Template">
    <meta name="author" content="xpressbuddy">
    <link rel="shortcut icon" href="assets/images/site_logo/favicon_1.svg">
    <link rel="stylesheet" type="text/css" href="assets/css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="assets/css/fontawesome.css">
    <link rel="stylesheet" type="text/css" href="assets/css/cursor.css">
    <link rel="stylesheet" type="text/css" href="assets/css/animate.min.css">
    <link rel="stylesheet" type="text/css" href="assets/css/aos.css">
    <link rel="stylesheet" type="text/css" href="assets/css/swiper-bundle.min.css">
    <link rel="stylesheet" type="text/css" href="assets/css/magnific-popup.min.css">
    <link rel="stylesheet" type="text/css" href="assets/css/odometer.min.css">
    <link rel="stylesheet" type="text/css" href="assets/css/style.css">
    
    {{#unless is_export}}<link rel="stylesheet" href="https://react-design-tools.tcp4.me/hbs-base/rdesign.css">{{/unless}}
  </head>
  <body>
  
  <div class="{{#unless is_export}}{{else}}sortable{{/unless}}">
    {{{content}}}
  </div>
  
  <script src="assets/js/jquery.min.js"></script>
    <script src="assets/js/popper.min.js"></script>
    <script src="assets/js/bootstrap.min.js"></script>
    <script src="assets/js/bootstrap-dropdown-ml-hack.min.js"></script>
    <script src="assets/js/cursor.js"></script>
    <script src="assets/js/gsap.js"></script>
    <script src="assets/js/gsap-scroll-trigger.js"></script>
    <script src="assets/js/gsap-split-text.js"></script>
    <script src="assets/js/smooth-scroll.js"></script>
    <script src="assets/js/aos.js"></script>
    <script src="assets/js/countdown.js"></script>
    <script src="assets/js/swiper-bundle.min.js"></script>
    <script src="assets/js/magnific-popup.min.js"></script>
    <script src="assets/js/appear.min.js"></script>
    <script src="assets/js/odometer.min.js"></script>
    <script src="assets/js/main.js"></script>
    
  
  {{#unless is_export}}
  <script src="https://react-design-tools.tcp4.me/hbs-base/rdesign.js"></script>
  {{/unless}}
  </body>
</html>`,
  name: 'Sample Template'
};

export default document;