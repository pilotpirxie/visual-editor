const document = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <title>Hello, world!</title>
  </head>
  <body>
  {{{content}}}
  <div id="visual-editor-rectangle" style="display: none; cursor: pointer; background-color: transparent; border: 2px dashed black; position: absolute; z-index: 9999;"></div>
  <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx" crossorigin="anonymous"></script>
  <script>
document.querySelectorAll('section[visual-editor]').forEach(el => {
  el.addEventListener('mouseenter', () => {
    const rectangle = document.getElementById('visual-editor-rectangle');
    
    rectangle.style.display = 'block';
    rectangle.style.top = el.offsetTop + 'px';
    rectangle.style.left = el.offsetLeft + 'px';
    rectangle.style.width = el.offsetWidth + 'px';
    rectangle.style.height = el.offsetHeight + 'px';
    rectangle.setAttribute('visual-editor', el.getAttribute('visual-editor'));
  });  
});

document.body.addEventListener('mouseleave', () => {
  const rectangle = document.getElementById('visual-editor-rectangle');
  rectangle.style.display = 'none';
});

document.getElementById('visual-editor-rectangle').addEventListener('click', () => {
  window.top.postMessage({
    event: 'click',
    blockId: document.getElementById('visual-editor-rectangle').getAttribute('visual-editor')
  }, '*');
});
  </script>
  </body>
</html>
`;

export default document;
