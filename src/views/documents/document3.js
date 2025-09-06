const hbs = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
    <link rel="stylesheet" href="https://bootswatch.com/4/cosmo/bootstrap.min.css">
    <title>{{#if title}}{{title}}{{else}}Hello, world!{{/if}}</title>
    <style>
        .responsive-icon { font-family: 'Material Icons'; font-size: inherit; line-height: 1; vertical-align: middle; transform: translateY(-0.1em); display: inline-block; }
        {{#unless is_export}}
        .drag-n-drop-placeholder {
            border: 2px dashed black; 
        }
        section[visual-editor]:hover {
            border: 2px dashed black; 
            cursor: grab;
        }
        section[visual-editor] {
            border: 2px solid transparent; 
        }
        {{/unless}}
        body { 
            animation: fadeInAnimation ease-in 150ms; 
            animation-iteration-count: 1; 
            animation-fill-mode: forwards; 
        } 
        @keyframes fadeInAnimation { 
            0% { 
                opacity: 0; 
            } 
            100% { 
                opacity: 1; 
            } 
        } 
    </style>
  </head>
  <body>
  
  <div class="{{#unless is_export}}sortable{{else}}container-fluid{{/unless}}">
    {{{content}}}
  </div>
  
  <script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx" crossorigin="anonymous"></script>
  {{#unless is_export}}
  <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
  
  <script>
    const scrollY = localStorage.getItem('scrollY');
    const bodyHeight = localStorage.getItem('bodyHeight');
    if (scrollY) {
        window.scrollTo(0, scrollY);
    }
    
    if (bodyHeight) {
        window.scroll(0, scrollY);
    }
    
    window.addEventListener('scroll', () => {
      localStorage.setItem('scrollY', window.scrollY);
    });
    
  $(function() {
    const sort = $(".sortable").sortable({
        placeholder: "drag-n-drop-placeholder",
        axis: 'y',
        cursor: 'grabbing',
        distance: 10,
        items: '> section[visual-editor]',
        opacity: 0.25,
        scrollSensitivity: 100,
        forcePlaceholderSize: true,
    }).disableSelection();
    
    $('a').click(function(e) {
        e.preventDefault();
    });
    
    sort.on("sortupdate", function( event, ui ) {
      const newOrder = [];
      document.querySelectorAll('section[visual-editor]').forEach(el => {
        newOrder.push(el.getAttribute('visual-editor'));
      });
      window.top.postMessage({
        event: 'sorted',
        newOrder
      }, '*');
    });
  });
  </script>
  
  <script>
  document.querySelectorAll('section[visual-editor]').forEach(el => {
    el.addEventListener('click', () => {
      window.top.postMessage({
        event: 'click',
        blockId: el.getAttribute('visual-editor')
      }, '*');
    })
  });
  </script>
  {{/unless}}
  </body>
</html>
`;

const document = {
  hbs,
  name: 'Bootswatch Cosmo (Bootstrap 4.5)'
}

export default document;
