type CountFormat = {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  decimalMark: string;
  groupMark: string;
};

const COUNT_PATTERN = /^(?<prefix>\D*)(?<number>\d(?:[\d.,\s]*\d)?)(?<suffix>.*)$/s;
const DECIMAL_TAIL = /[.,](?<digits>\d+)$/;
const GROUP_MARK = /[.,\s]/;
const NON_DIGITS = /\D/g;
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;
const GROUP_SIZE = 3;
const DURATION_MS = 1200;
const VISIBLE_THRESHOLD = 0.5;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const countedElements = new WeakSet<Element>();

function parseCount(text: string): CountFormat | null {
  const groups = COUNT_PATTERN.exec(text.trim())?.groups;
  if (groups?.number === undefined) return null;
  const number = groups.number;
  const tail = DECIMAL_TAIL.exec(number);
  const fraction = tail?.groups?.digits ?? '';
  const isDecimal = tail !== null && fraction.length !== GROUP_SIZE;
  const integerPart = isDecimal ? number.slice(0, tail.index) : number;
  const integerDigits = integerPart.replace(NON_DIGITS, '');
  return {
    prefix: groups.prefix ?? '',
    suffix: groups.suffix ?? '',
    value: Number(isDecimal ? `${integerDigits}.${fraction}` : integerDigits),
    decimals: isDecimal ? fraction.length : 0,
    decimalMark: isDecimal ? number.charAt(tail.index) : '',
    groupMark: GROUP_MARK.exec(integerPart)?.[0] ?? '',
  };
}

function formatCount(format: CountFormat, value: number): string {
  const [integer = '0', fraction = ''] = value.toFixed(format.decimals).split('.');
  const grouped = format.groupMark === '' ? integer : integer.replace(THOUSANDS, format.groupMark);
  const decimals = fraction === '' ? '' : `${format.decimalMark}${fraction}`;
  return `${format.prefix}${grouped}${decimals}${format.suffix}`;
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

type Counter = { element: HTMLElement; format: CountFormat; finalText: string };

function countersIn(root: HTMLElement): Counter[] {
  const counters: Counter[] = [];
  for (const element of root.querySelectorAll<HTMLElement>('[data-count]')) {
    if (countedElements.has(element)) continue;
    const finalText = element.textContent ?? '';
    const format = parseCount(finalText);
    if (format !== null) counters.push({ element, format, finalText });
  }
  return counters;
}

function connectCounters(view: Window, counters: Counter[]): () => void {
  const frames = new Map<Element, number>();

  function animate(counter: Counter): void {
    const startedAt = view.performance.now();
    function step(now: number): void {
      const progress = Math.min((now - startedAt) / DURATION_MS, 1);
      counter.element.textContent = formatCount(
        counter.format,
        counter.format.value * easeOut(progress),
      );
      if (progress < 1) {
        frames.set(counter.element, view.requestAnimationFrame(step));
        return;
      }
      frames.delete(counter.element);
      counter.element.textContent = counter.finalText;
    }
    frames.set(counter.element, view.requestAnimationFrame(step));
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const counter = counters.find(({ element }) => element === entry.target);
        if (counter === undefined) continue;
        countedElements.add(counter.element);
        animate(counter);
      }
    },
    { threshold: VISIBLE_THRESHOLD },
  );

  for (const counter of counters) {
    const { width } = counter.element.getBoundingClientRect();
    counter.element.style.display = 'inline-block';
    counter.element.style.minWidth = `${width}px`;
    counter.element.textContent = formatCount(counter.format, 0);
    observer.observe(counter.element);
  }

  return () => {
    observer.disconnect();
    for (const frame of frames.values()) view.cancelAnimationFrame(frame);
    for (const counter of counters) {
      counter.element.textContent = counter.finalText;
      counter.element.style.removeProperty('display');
      counter.element.style.removeProperty('min-width');
    }
  };
}

siteRuntime.register({
  name: 'counter',
  init(root) {
    const view = root.ownerDocument.defaultView;
    if (view === null || typeof IntersectionObserver !== 'function') return () => {};
    if (view.matchMedia(REDUCED_MOTION_QUERY).matches) return () => {};
    const counters = countersIn(root);
    if (counters.length === 0) return () => {};
    return connectCounters(view, counters);
  },
});
