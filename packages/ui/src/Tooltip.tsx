import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type JSX,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { placeNear } from './placement';
import { ariaKeyShortcut, shortcutLabel } from './shortcuts';
import './Tooltip.css';

type TooltipOptions = { text: string; shortcut?: string; isDescription?: boolean };

type TooltipTriggerProps = {
  'aria-describedby'?: string;
  'aria-keyshortcuts'?: string;
  onPointerEnter(event: PointerEvent<HTMLElement>): void;
  onPointerLeave(): void;
  onPointerDown(): void;
  onFocus(event: FocusEvent<HTMLElement>): void;
  onBlur(): void;
};

type Tooltip = { triggerProps: TooltipTriggerProps; tooltip: JSX.Element | null };

type TooltipCoordinator = { closeActive: (() => void) | null; lastClosedAt: number };

const OPEN_DELAY_MS = 500;
const CLOSE_DELAY_MS = 100;
const WARM_WINDOW_MS = 300;
const tooltipCoordinator: TooltipCoordinator = { closeActive: null, lastClosedAt: 0 };

function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch (error) {
    console.warn('This browser cannot tell keyboard focus apart', error);
    return true;
  }
}

export function useTooltip({ text, shortcut, isDescription = false }: TooltipOptions): Tooltip {
  const id = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  const clearTimer = useCallback((): void => {
    window.clearTimeout(timerRef.current);
  }, []);

  const close = useCallback((): void => {
    clearTimer();
    setIsOpen((wasOpen) => {
      if (wasOpen) tooltipCoordinator.lastClosedAt = Date.now();
      return false;
    });
  }, [clearTimer]);

  const open = useCallback((): void => {
    clearTimer();
    if (text === '') return;
    if (tooltipCoordinator.closeActive !== close) tooltipCoordinator.closeActive?.();
    tooltipCoordinator.closeActive = close;
    setIsOpen(true);
  }, [clearTimer, close, text]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    document.addEventListener('keydown', closeOnEscape, true);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', closeOnEscape, true);
      window.removeEventListener('scroll', close, true);
      if (tooltipCoordinator.closeActive === close) tooltipCoordinator.closeActive = null;
    };
  }, [isOpen, close]);

  useEffect(() => clearTimer, [clearTimer]);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const trigger = triggerRef.current;
    if (!isOpen || tooltip === null || trigger === null) return;
    try {
      tooltip.showPopover();
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error;
      console.warn(`Tooltip "${text}" skipped while another popover was changing`, error);
      timerRef.current = window.setTimeout(close, 0);
      return;
    }
    const position = placeNear(
      trigger.getBoundingClientRect(),
      { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    tooltip.style.top = `${position.top}px`;
    tooltip.style.left = `${position.left}px`;
  }, [isOpen, close, text]);

  function scheduleOpen(event: PointerEvent<HTMLElement>): void {
    if (event.pointerType === 'touch') return;
    triggerRef.current = event.currentTarget;
    const isWarm = Date.now() - tooltipCoordinator.lastClosedAt < WARM_WINDOW_MS;
    if (isWarm) {
      open();
      return;
    }
    clearTimer();
    timerRef.current = window.setTimeout(open, OPEN_DELAY_MS);
  }

  function scheduleClose(): void {
    clearTimer();
    timerRef.current = window.setTimeout(close, CLOSE_DELAY_MS);
  }

  const tooltipId = `${id}-tooltip`;
  const triggerProps: TooltipTriggerProps = {
    onPointerEnter: scheduleOpen,
    onPointerLeave: scheduleClose,
    onPointerDown: close,
    onFocus: (event) => {
      triggerRef.current = event.currentTarget;
      if (!(event.target instanceof Element) || !isFocusVisible(event.target)) return;
      clearTimer();
      timerRef.current = window.setTimeout(open, 0);
    },
    onBlur: close,
  };
  if (isDescription && isOpen) triggerProps['aria-describedby'] = tooltipId;
  if (shortcut !== undefined) triggerProps['aria-keyshortcuts'] = ariaKeyShortcut(shortcut);

  const tooltip = isOpen ? (
    <div
      ref={tooltipRef}
      id={tooltipId}
      className="ui-tooltip"
      popover="manual"
      role="tooltip"
      aria-hidden={isDescription ? undefined : 'true'}
      onPointerEnter={clearTimer}
      onPointerLeave={scheduleClose}
    >
      {text}
      {shortcut !== undefined && <kbd>{shortcutLabel(shortcut)}</kbd>}
    </div>
  ) : null;

  return { triggerProps, tooltip };
}

type TooltipLabelProps = { text: string; className?: string; children: ReactNode };

export function TooltipLabel({ text, className, children }: TooltipLabelProps): JSX.Element {
  const { triggerProps, tooltip } = useTooltip({ text });
  return (
    <>
      <label className={className} {...triggerProps}>
        {children}
      </label>
      {tooltip}
    </>
  );
}
