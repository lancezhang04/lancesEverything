import { useRef, useEffect } from 'react';
import { DAYS, Day } from '../../data/workoutData';

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COPIES = 5;
const LOOPED = Array.from({ length: COPIES }, () => [...DAYS]).flat();
const MIDDLE_OFFSET = 2 * DAYS.length;

interface DaySelectorProps {
  selected: Day;
  onSelect: (day: Day) => void;
}

export const DaySelector = ({ selected, onSelect }: DaySelectorProps) => {
  const todayIndex = (new Date().getDay() + 6) % 7;
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = DAYS.indexOf(selected);
  const isJumping = useRef(false);
  const isMounted = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!isMounted.current) {
      // Instant scroll on mount — no animation
      isMounted.current = true;
      const target = el.children[selectedIndex + MIDDLE_OFFSET] as HTMLElement;
      if (!target) return;
      const elRect = el.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      el.scrollLeft += tRect.left - elRect.left - (elRect.width - tRect.width) / 2;
      return;
    }

    // Scroll to whichever copy of this day is closest to the current viewport center
    const viewCenter = el.scrollLeft + el.clientWidth / 2;
    let closest: HTMLElement | null = null;
    let minDist = Infinity;
    LOOPED.forEach((day, i) => {
      if (day !== selected) return;
      const pill = el.children[i] as HTMLElement | undefined;
      if (!pill) return;
      const dist = Math.abs(pill.offsetLeft + pill.offsetWidth / 2 - viewCenter);
      if (dist < minDist) { minDist = dist; closest = pill; }
    });
    (closest as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected, selectedIndex]);

  // Infinite loop: jump when scrolled into first or last copy
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isJumping.current) return;
      const oneSet = el.scrollWidth / COPIES;
      if (el.scrollLeft < oneSet) {
        isJumping.current = true;
        el.scrollLeft += oneSet * 2;
        requestAnimationFrame(() => { isJumping.current = false; });
      } else if (el.scrollLeft + el.clientWidth > oneSet * (COPIES - 1)) {
        isJumping.current = true;
        el.scrollLeft -= oneSet * 2;
        requestAnimationFrame(() => { isJumping.current = false; });
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative">
      {/* Gradient fades at both ends */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-slate-900 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-slate-900 to-transparent" />

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pt-1 pb-1 px-1 no-scrollbar"
      >
        {LOOPED.map((day, i) => {
          const dayIndex = i % 7;
          const isSelected = day === selected;
          const isToday = dayIndex === todayIndex;
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`
                relative flex-shrink-0 px-4 sm:px-5 py-2 rounded-full text-sm font-medium
                transition-all duration-200
                ${isSelected
                  ? isToday
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }
              `}
            >
              <span className="sm:hidden">{SHORT[dayIndex]}</span>
              <span className="hidden sm:inline">{day}</span>
              {isToday && !isSelected && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Underglow — absolutely positioned so it doesn't affect layout, escaping the overflow clip */}
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-1 w-14 h-1.5 rounded-full blur-md ${
          DAYS[todayIndex] === selected ? 'bg-amber-400/70' : 'bg-blue-500/60'
        }`}
      />
    </div>
  );
};
