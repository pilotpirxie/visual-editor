const hbs = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <title>{{#if title}}{{title}}{{else}}Hello, world!{{/if}}</title>
    <style>
        .responsive-icon { font-family: 'Material Icons'; font-size: inherit; line-height: 1; vertical-align: middle; transform: translateY(-0.1em); display: inline-block; }        
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
        {{#unless is_export}}
        .sortable-ghost {
            opacity: 0.4;
            border: 2px dashed black;
        }
        section[visual-editor]:hover {
            border: 2px dashed black; 
            cursor: grab;
        }
        section[visual-editor] {
            border: 2px solid transparent; 
        }
        .content-area {
            min-height: 50px; /* Visual cue for empty drop zones */
        }
        {{/unless}}
    </style>
  </head>
  <body>
  
  <div class="{{#unless is_export}}sortable{{else}}container-fluid{{/unless}}">
    {{{content}}}
  </div>
  
  <script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx" crossorigin="anonymous"></script>
  {{#unless is_export}}
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
  <script>
    // Restore scroll position after reload
    const scrollY = localStorage.getItem('scrollY');
    if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
    }
    window.addEventListener('scroll', () => {
        localStorage.setItem('scrollY', window.scrollY.toString());
    });

    document.addEventListener('DOMContentLoaded', function() {
        const sortableOptions = {
            group: 'shared', // Allow dragging between different lists
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const itemEl = evt.item; // The dragged element
                const toContainer = evt.to;   // The list the item was dropped into
                
                const blockUuid = itemEl.getAttribute('visual-editor');
                const newIndex = evt.newIndex;

                const parentSection = toContainer.closest('section[visual-editor]');
                const targetParentUuid = parentSection ? parentSection.getAttribute('visual-editor') : null;

                window.top.postMessage({
                    event: 'MOVE_BLOCK',
                    payload: {
                        blockUuid: blockUuid,
                        targetParentUuid: targetParentUuid,
                        newIndex: newIndex,
                    }
                }, '*');
            }
        };

        // Initialize the main container
        const mainContainer = document.querySelector('.sortable');
        Sortable.create(mainContainer, sortableOptions);

        // Initialize all nested content areas
        document.querySelectorAll('.content-area').forEach(area => {
            Sortable.create(area, sortableOptions);
        });

        // Add click listeners to all sections
        document.querySelectorAll('section[visual-editor]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to parent sortable containers
                window.top.postMessage({
                    event: 'click',
                    blockId: el.getAttribute('visual-editor')
                }, '*');
            });
        });

        // Prevent default behavior on links
        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
            });
        });
    });
  </script>
  {{/unless}}
  </body>
</html>
`;

const document = {
  hbs,
  name: 'Default (Bootstrap 4.5)'
}

export default document;