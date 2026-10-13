const EMBED_HOSTS = ['www.youtube-nocookie.com', 'player.vimeo.com'];
const FRAME_PERMISSIONS = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
const DEFAULT_TITLE = 'Video';

function frameAddress(root: HTMLElement): string | null {
  const source = root.dataset.embedSrc ?? '';
  if (!URL.canParse(source)) return null;
  const url = new URL(source);
  const isAllowed = url.protocol === 'https:' && EMBED_HOSTS.includes(url.hostname);
  return isAllowed ? url.href : null;
}

siteRuntime.register({
  name: 'embed',
  init(root) {
    const trigger = root.querySelector<HTMLElement>('[data-embed-trigger]');
    const address = frameAddress(root);
    const view = root.ownerDocument.defaultView;
    if (trigger === null || address === null || view === null) return () => {};
    const frame = root.ownerDocument.createElement('iframe');

    function play(event: MouseEvent): void {
      const opensElsewhere = event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0;
      if (event.defaultPrevented || opensElsewhere || address === null || view === null) return;
      event.preventDefault();
      const poster = root.firstElementChild ?? root;
      frame.src = address;
      frame.title = root.dataset.embedTitle?.trim() || DEFAULT_TITLE;
      frame.allow = FRAME_PERMISSIONS;
      frame.allowFullscreen = true;
      frame.setAttribute('data-embed-frame', '');
      Object.assign(frame.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: view.getComputedStyle(poster).borderRadius,
      });
      if (view.getComputedStyle(root).position === 'static') root.style.position = 'relative';
      root.append(frame);
      frame.focus();
    }

    trigger.addEventListener('click', play);
    return () => {
      trigger.removeEventListener('click', play);
      frame.remove();
    };
  },
});
