import { useMemo } from 'react';

const TICK_COUNT = 60;
const INNER = 82;
const OUTER = 93;

interface TickDialProps {
  /** Share of the step still to run, 0–1. Overtime passes 0. */
  fraction: number;
  /** Tailwind stroke class for lit ticks. */
  stroke: string;
  children: React.ReactNode;
}

/**
 * A stopwatch bezel rather than a progress bar: 60 ticks that go out as the step
 * drains, so a glance from six feet away reads roughly how long is left without
 * resolving the digits.
 */
export const TickDial = ({ fraction, stroke, children }: TickDialProps) => {
  const ticks = useMemo(
    () =>
      Array.from({ length: TICK_COUNT }, (_, i) => {
        const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
        return {
          x1: 100 + Math.cos(angle) * INNER,
          y1: 100 + Math.sin(angle) * INNER,
          x2: 100 + Math.cos(angle) * OUTER,
          y2: 100 + Math.sin(angle) * OUTER,
        };
      }),
    [],
  );

  const lit = Math.max(0, Math.min(TICK_COUNT, Math.ceil(fraction * TICK_COUNT)));

  return (
    <div className="relative grid aspect-square w-[min(66vw,252px)] place-items-center">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            strokeWidth={2.6}
            strokeLinecap="round"
            className={`transition-colors duration-200 ${i < lit ? stroke : 'stroke-slate-700'}`}
          />
        ))}
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
};
