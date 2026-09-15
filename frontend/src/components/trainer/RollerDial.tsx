import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Row height in px. Drives the snap geometry and the scrollTop → index maths,
 * and is sized for a thumb and an arm's-length glance rather than for fitting
 * the most numbers on screen.
 */
const ITEM = 38;

interface RollerDialProps {
  values: number[];
  /** Null until she's touched it — the dial shows a dash rather than guessing. */
  value: number | null;
  /** Where an untouched dial parks, and what her first scroll commits to. */
  fallback: number;
  onChange: (value: number) => void;
  label: string;
  /** Tailwind text-colour class; the centre band borrows it via border-current. */
  accent: string;
  /** Changing this re-parks the dial — one movement's numbers mustn't ride into the next. */
  syncKey: string;
}

/**
 * A scroll wheel, not a slider. Momentum, deceleration and snap all come from
 * the platform's own overflow scrolling, which is why a fast swipe travels
 * further than a slow drag without a line of physics here: a hand-rolled
 * inertia loop reliably feels worse than the one the OS ships.
 *
 * The selection is whatever sits in the fixed centre band — the band never
 * moves, the numbers pass through it.
 */
export const RollerDial = ({
  values,
  value,
  fallback,
  onChange,
  label,
  accent,
  syncKey,
}: RollerDialProps) => {
  const ref = useRef<HTMLDivElement>(null);
  /** Null until measured; the dial can't park before it knows its own height. */
  const [pad, setPad] = useState<number | null>(null);
  const [active, setActive] = useState(() => Math.max(0, values.indexOf(value ?? fallback)));

  /* Parking the dial scrolls it, and a scroll normally means "she chose this".
     This flag keeps our own scrolls from reporting back as her input. */
  const parking = useRef(false);
  const frame = useRef(0);
  const reported = useRef(-1);
  const padRef = useRef<number | null>(null);

  /* Half a row of padding top and bottom, so the first and last value can both
     reach the centre band. Re-measured because the stage compresses on short
     phones. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* Changing the padding makes the browser adjust scrollTop, which fires
       scroll events that are emphatically not her input — a rotation or a
       collapsing URL bar would otherwise silently rewrite the logged number.
       Shut reporting off before the geometry moves; the re-park turns it back
       on once the dial has settled on the value it already had. */
    const measure = () => {
      const next = Math.max(0, (el.clientHeight - ITEM) / 2);
      if (next === padRef.current) return;
      padRef.current = next;
      parking.current = true;
      setPad(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const park = useCallback(
    (index: number) => {
      const el = ref.current;
      if (!el || pad === null) return;
      parking.current = true;
      el.scrollTop = index * ITEM;
      setActive(index);
      reported.current = index;
      window.setTimeout(() => {
        parking.current = false;
      }, 80);
    },
    [pad],
  );

  /* Re-parks whenever the dial is showing something other than the value it has
     been given — on mount, on a re-measure, and when the parent loads a saved
     number a tick after this mounted. `reported` is the index she last landed
     on, so an echo of her own scroll matches and is skipped; only a genuinely
     external value moves the wheel under her. */
  useEffect(() => {
    const target = values.indexOf(value ?? fallback);
    const i = target < 0 ? 0 : target;
    if (i === reported.current) return;
    park(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey, pad, park, value]);

  /* Nothing chosen yet. The wheel still shows its numbers — that's the only
     hint it can be scrolled — but the one under the band is blanked so the dash
     stands in its place instead of being struck through it. */
  const unset = value === null;

  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = ref.current;
      if (!el) return;
      const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
      if (i === reported.current) return;
      reported.current = i;
      setActive(i);
      if (!parking.current) onChange(values[i]);
    });
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div className="flex h-full w-full flex-col items-center">
      {/* A panel, so the column reads as a control rather than as numbers that
          happen to be near the clock. */}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg bg-slate-800/50">
        {/* The selection window. Fixed — the numbers move past it. */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y border-current opacity-30 ${accent}`}
          style={{ height: ITEM }}
        />

        <div
          ref={ref}
          onScroll={onScroll}
          role="listbox"
          aria-label={label}
          tabIndex={0}
          className="h-full w-full overflow-y-scroll overscroll-contain [scroll-snap-type:y_mandatory]"
          style={{ paddingTop: pad ?? 0, paddingBottom: pad ?? 0 }}
        >
          {values.map((v, i) => {
            const d = Math.abs(i - active);
            return (
              <div
                key={v}
                role="option"
                aria-selected={d === 0}
                /* No opacity transition: on a wheel the dimming should track the
                   rows instantly, and a fade makes the unset dash look briefly
                   like a strikethrough over the number it replaces. */
                className={`flex items-center justify-center tabular-nums ${
                  d === 0 ? `text-[1.15rem] font-semibold ${accent}` : 'text-[0.95rem] text-slate-300'
                }`}
                style={{
                  height: ITEM,
                  scrollSnapAlign: 'center',
                  opacity:
                    unset && d === 0 ? 0 : d === 0 ? 1 : d === 1 ? 0.55 : d === 2 ? 0.3 : 0.16,
                }}
              >
                {v}
              </div>
            );
          })}
        </div>

        {/* Never set: park silently at the fallback and say so, rather than
            showing a number she didn't choose and might trust. */}
        {unset && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            <span className={`text-2xl font-semibold leading-none ${accent}`}>—</span>
          </div>
        )}
      </div>

      <span className="mt-1 flex-none text-[0.7rem] uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
    </div>
  );
};
