import { afterEach, describe, expect, it } from 'vitest';
import '../core';
import './embed';

const PLAYER = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1';

type Fixture = { player: HTMLElement; trigger: HTMLAnchorElement; detach: () => void };

function setup(source: string): Fixture {
  const host = document.createElement('div');
  host.innerHTML = `
    <div data-behavior="embed" data-embed-title="Product tour">
      <div class="poster"></div>
      <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" data-embed-trigger>Play</a>
    </div>`;
  const player = host.querySelector<HTMLElement>('[data-behavior]');
  const trigger = host.querySelector('a');
  if (player === null || trigger === null) throw new Error('fixture is incomplete');
  player.dataset.embedSrc = source;
  document.body.append(host);
  return { player, trigger, detach: window.siteRuntime.attach(host) };
}

function press(trigger: HTMLElement, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  trigger.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('embed behavior', () => {
  it('swaps in the player when the poster link is pressed', () => {
    const { player, trigger } = setup(PLAYER);
    expect(player.querySelector('iframe')).toBeNull();
    const event = press(trigger);
    const frame = player.querySelector('iframe');
    expect(event.defaultPrevented).toBe(true);
    expect(frame?.src).toBe(PLAYER);
    expect(frame?.title).toBe('Product tour');
    expect(frame?.allow).toContain('autoplay');
    expect(frame?.style.position).toBe('absolute');
    expect(player.style.position).toBe('relative');
  });

  it('leaves the link alone when it should open in a new tab or was already handled', () => {
    const { player, trigger } = setup(PLAYER);
    expect(press(trigger, { metaKey: true }).defaultPrevented).toBe(false);
    trigger.addEventListener('click', (event) => event.preventDefault(), { capture: true });
    press(trigger);
    expect(player.querySelector('iframe')).toBeNull();
  });

  it.each([
    'https://evil.example/embed/dQw4w9WgXcQ',
    'http://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'javascript:alert(1)',
    '',
  ])('keeps the plain link for the address %s', (source) => {
    const { player, trigger } = setup(source);
    expect(press(trigger).defaultPrevented).toBe(false);
    expect(player.querySelector('iframe')).toBeNull();
  });

  it('removes the player when the behavior stops', () => {
    const { player, trigger, detach } = setup(PLAYER);
    press(trigger);
    detach();
    expect(player.querySelector('iframe')).toBeNull();
    expect(press(trigger).defaultPrevented).toBe(false);
  });
});
