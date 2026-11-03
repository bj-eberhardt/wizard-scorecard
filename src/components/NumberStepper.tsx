import { Minus, Plus } from 'lucide-react';
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
  disabled?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  testId?: string;
};

const HOLD_DELAY = 400;
const NORMAL_REPEAT_INTERVAL = 150;
const FAST_REPEAT_INTERVAL = 75;
const FAST_REPEAT_AFTER = 1200;

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  disabled = false,
  decreaseLabel,
  increaseLabel,
  testId,
}: NumberStepperProps) {
  const valueRef = useRef(value);
  const holdTimerRef = useRef<number | null>(null);
  const repeatTimerRef = useRef<number | null>(null);
  const holdStartedAtRef = useRef<number | null>(null);
  const wasHeldRef = useRef(false);
  const suppressClickRef = useRef(false);

  valueRef.current = value;

  const clearTimers = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    if (repeatTimerRef.current !== null) window.clearTimeout(repeatTimerRef.current);
    holdTimerRef.current = null;
    repeatTimerRef.current = null;
    holdStartedAtRef.current = null;
  };

  const changeBy = (delta: number) => {
    const next = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, valueRef.current + delta));
    if (next === valueRef.current) return false;
    valueRef.current = next;
    onChange(next);
    return true;
  };

  const startRepeat = (delta: number) => {
    wasHeldRef.current = true;

    const repeat = () => {
      if (!changeBy(delta)) {
        clearTimers();
        return;
      }

      const elapsed = performance.now() - (holdStartedAtRef.current ?? performance.now());
      const interval = elapsed >= FAST_REPEAT_AFTER ? FAST_REPEAT_INTERVAL : NORMAL_REPEAT_INTERVAL;
      repeatTimerRef.current = window.setTimeout(repeat, interval);
    };

    repeat();
  };

  const handlePointerDown = (delta: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    clearTimers();
    wasHeldRef.current = false;
    suppressClickRef.current = false;
    holdStartedAtRef.current = performance.now();
    holdTimerRef.current = window.setTimeout(() => startRepeat(delta), HOLD_DELAY);
  };

  const handlePointerUp = () => {
    suppressClickRef.current = wasHeldRef.current;
    clearTimers();
    wasHeldRef.current = false;
  };

  const handleClick = (delta: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    changeBy(delta);
  };

  const decrementDisabled = disabled || value <= min;
  const incrementDisabled = disabled || (max !== undefined && value >= max);

  return (
    <div
      className="inline-flex min-h-11 items-center gap-2"
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      data-testid={testId}
    >
      <button
        type="button"
        className="btn-secondary min-h-11 min-w-11 p-2"
        aria-label={decreaseLabel}
        disabled={decrementDisabled}
        data-testid={testId ? `${testId}-decrease` : undefined}
        onPointerDown={(event) => handlePointerDown(-1, event)}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearTimers();
          wasHeldRef.current = false;
          suppressClickRef.current = false;
        }}
        onLostPointerCapture={clearTimers}
        onContextMenu={(event) => {
          event.preventDefault();
          clearTimers();
          wasHeldRef.current = false;
          suppressClickRef.current = false;
        }}
        onClick={() => handleClick(-1)}
      >
        <Minus aria-hidden="true" size={20} />
      </button>
      <span className="min-w-8 text-center text-lg font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        className="btn-secondary min-h-11 min-w-11 p-2"
        aria-label={increaseLabel}
        disabled={incrementDisabled}
        data-testid={testId ? `${testId}-increase` : undefined}
        onPointerDown={(event) => handlePointerDown(1, event)}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearTimers();
          wasHeldRef.current = false;
          suppressClickRef.current = false;
        }}
        onLostPointerCapture={clearTimers}
        onContextMenu={(event) => {
          event.preventDefault();
          clearTimers();
          wasHeldRef.current = false;
          suppressClickRef.current = false;
        }}
        onClick={() => handleClick(1)}
      >
        <Plus aria-hidden="true" size={20} />
      </button>
    </div>
  );
}
