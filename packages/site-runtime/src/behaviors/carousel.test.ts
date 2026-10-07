import { afterEach, describe, expect, it, vi } from 'vitest';
import '../core';
import './carousel';

const SLIDE_WIDTH = 300;

function setup(): { host: HTMLElement; track: HTMLElement; detach: () => void } {
  const host = document.createElement('div');
  host.innerHTML = `
    <section data-behavior="carousel">
      <div data-carousel-track>
        <figure data-carousel-slide>One</figure>
        <figure data-carousel-slide>Two</figure>
        <figure data-carousel-slide>Three</figure>
      </div>
      <div data-carousel-controls hidden>
        <button type="button" data-carousel-previous>Previous</button>
        <div data-carousel-dots="Testimonial"></div>
        <button type="button" data-carousel-next>Next</button>
      </div>
    </section>`;
  document.body.append(host);
  const track = host.querySelector<HTMLElement>('[data-carousel-track]');
  if (track === null) throw new Error('No track');
  for (const [index, slide] of track.querySelectorAll('[data-carousel-slide]').entries()) {
    vi.spyOn(slide, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: index * SLIDE_WIDTH - track.scrollLeft, width: SLIDE_WIDTH }),
    );
  }
  Object.defineProperty(track, 'clientWidth', { value: SLIDE_WIDTH });
  Object.defineProperty(track, 'scrollWidth', { value: SLIDE_WIDTH * 3 });
  track.scrollTo = vi.fn();
  const detach = window.siteRuntime.attach(host);
  return { host, track, detach };
}

function button(host: HTMLElement, selector: string): HTMLButtonElement {
  const element = host.querySelector<HTMLButtonElement>(selector);
  if (element === null) throw new Error(`No ${selector}`);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('carousel behavior', () => {
  it('shows the controls with one labelled dot per slide', () => {
    const { host } = setup();
    expect(button(host, '[data-carousel-next]').closest('[hidden]')).toBeNull();
    const dots = host.querySelectorAll('[data-carousel-dots] button');
    expect([...dots].map((dot) => dot.getAttribute('aria-label'))).toEqual([
      'Testimonial 1 of 3',
      'Testimonial 2 of 3',
      'Testimonial 3 of 3',
    ]);
    expect(dots[0]?.getAttribute('aria-current')).toBe('true');
    expect(button(host, '[data-carousel-previous]').disabled).toBe(true);
  });

  it('scrolls one slide with next and to a slide with its dot', () => {
    const { host, track } = setup();
    button(host, '[data-carousel-next]').click();
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: SLIDE_WIDTH, behavior: 'smooth' });
    button(host, '[data-carousel-dots] button:nth-child(3)').click();
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: SLIDE_WIDTH * 2, behavior: 'smooth' });
  });

  it('removes the dots and hides the controls on cleanup', () => {
    const { host, detach } = setup();
    detach();
    expect(host.querySelectorAll('[data-carousel-dots] button')).toHaveLength(0);
    expect(host.querySelector<HTMLElement>('[data-carousel-controls]')?.hidden).toBe(true);
  });
});
