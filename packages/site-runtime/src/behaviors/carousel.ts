type CarouselParts = {
  track: HTMLElement;
  slides: HTMLElement[];
  controls: HTMLElement;
  previous: HTMLButtonElement;
  next: HTMLButtonElement;
  dots: HTMLElement;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function carouselParts(root: HTMLElement): CarouselParts | null {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const controls = root.querySelector<HTMLElement>('[data-carousel-controls]');
  const previous = root.querySelector<HTMLButtonElement>('[data-carousel-previous]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const dots = root.querySelector<HTMLElement>('[data-carousel-dots]');
  if (track === null || controls === null || previous === null || next === null || dots === null) {
    return null;
  }
  const slides = [...track.querySelectorAll<HTMLElement>('[data-carousel-slide]')];
  return { track, slides, controls, previous, next, dots };
}

function slideOffset(track: HTMLElement, slide: HTMLElement): number {
  const trackLeft = track.getBoundingClientRect().left;
  return slide.getBoundingClientRect().left - trackLeft + track.scrollLeft;
}

function nearestSlideIndex(track: HTMLElement, slides: HTMLElement[]): number {
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const [index, slide] of slides.entries()) {
    const distance = Math.abs(slideOffset(track, slide) - track.scrollLeft);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function isAtEnd(track: HTMLElement): boolean {
  return track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
}

function createDots(parts: CarouselParts, label: string): HTMLButtonElement[] {
  const doc = parts.track.ownerDocument;
  const buttons: HTMLButtonElement[] = [];
  for (const [index] of parts.slides.entries()) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'carousel-dot';
    button.setAttribute('aria-label', `${label} ${index + 1} of ${parts.slides.length}`);
    parts.dots.append(button);
    buttons.push(button);
  }
  return buttons;
}

function connectCarousel(root: HTMLElement, parts: CarouselParts): () => void {
  const { track, slides, controls, previous, next, dots } = parts;
  const view = root.ownerDocument.defaultView;
  const reducedMotion = view?.matchMedia(REDUCED_MOTION_QUERY);
  const dotButtons = createDots(parts, dots.dataset.carouselDots || 'Slide');
  let frame = 0;

  function scrollToSlide(index: number): void {
    const slide = slides[Math.max(0, Math.min(index, slides.length - 1))];
    if (slide === undefined) return;
    const behavior = reducedMotion?.matches === true ? 'auto' : 'smooth';
    track.scrollTo({ left: slideOffset(track, slide), behavior });
  }

  function update(): void {
    frame = 0;
    const current = nearestSlideIndex(track, slides);
    for (const [index, button] of dotButtons.entries()) {
      button.setAttribute('aria-current', String(index === current));
    }
    previous.disabled = track.scrollLeft <= 1;
    next.disabled = isAtEnd(track);
  }

  function scheduleUpdate(): void {
    if (frame !== 0 || view === null) return;
    frame = view.requestAnimationFrame(update);
  }

  function goToPrevious(): void {
    scrollToSlide(nearestSlideIndex(track, slides) - 1);
  }

  function goToNext(): void {
    scrollToSlide(nearestSlideIndex(track, slides) + 1);
  }

  function goToDot(event: Event): void {
    const index = dotButtons.findIndex((button) => button === event.target);
    if (index >= 0) scrollToSlide(index);
  }

  controls.hidden = false;
  previous.addEventListener('click', goToPrevious);
  next.addEventListener('click', goToNext);
  dots.addEventListener('click', goToDot);
  track.addEventListener('scroll', scheduleUpdate, { passive: true });
  view?.addEventListener('resize', scheduleUpdate);
  update();

  return () => {
    if (frame !== 0) view?.cancelAnimationFrame(frame);
    previous.removeEventListener('click', goToPrevious);
    next.removeEventListener('click', goToNext);
    dots.removeEventListener('click', goToDot);
    track.removeEventListener('scroll', scheduleUpdate);
    view?.removeEventListener('resize', scheduleUpdate);
    for (const button of dotButtons) button.remove();
    previous.disabled = false;
    next.disabled = false;
    controls.hidden = true;
  };
}

siteRuntime.register({
  name: 'carousel',
  init(root) {
    const parts = carouselParts(root);
    if (parts === null || parts.slides.length === 0) {
      console.warn(
        'siteRuntime carousel: needs a [data-carousel-track] of slides and its controls',
        root,
      );
      return () => {};
    }
    return connectCarousel(root, parts);
  },
});
