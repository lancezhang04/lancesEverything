import { useState, useEffect, useRef } from 'react';
import { Exercise, MuscleActivation } from '../../data/workoutData';

const RatingBar = ({ rating }: { rating: number }) => (
  <div className="flex gap-[3px]">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className={`w-[7px] h-[7px] rounded-[1px] ${
          i < rating ? 'bg-blue-400' : 'bg-slate-600/60'
        }`}
      />
    ))}
  </div>
);

const TargetSummary = ({ targets }: { targets: MuscleActivation[] }) => {
  if (targets.length === 0) return <span className="text-slate-500 text-xs">—</span>;

  // Group by muscle
  const groups: Record<string, MuscleActivation[]> = {};
  for (const t of targets) {
    (groups[t.muscle] ??= []).push(t);
  }

  return (
    <div className="space-y-1.5">
      {Object.entries(groups).map(([muscle, activations]) => (
        <div key={muscle}>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">{muscle}</span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {activations.map((a) => (
              <div key={a.head} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-300 whitespace-nowrap">{a.head}</span>
                <RatingBar rating={a.rating} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface ExerciseRowProps {
  exercise: Exercise;
  isExpanded: boolean;
  onToggle: () => void;
}

const ExerciseCard = ({ exercise, isExpanded, onToggle }: ExerciseRowProps) => {
  const hasVideo = exercise.videoId.length > 0;
  const embedUrl = hasVideo
    ? `https://www.youtube.com/embed/${exercise.videoId}${exercise.videoStart ? `?start=${exercise.videoStart}` : ''}`
    : '';

  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-100">{exercise.name}</div>
          {exercise.alternative && (
            <div className="text-[10px] text-slate-500 mt-0.5">Alt: {exercise.alternative}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm text-slate-300">{exercise.sets}</div>
          <div className="text-xs text-slate-500">{exercise.reps}</div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-700/40">
        <TargetSummary targets={exercise.targets} />
      </div>

      {hasVideo && (
        <div className="mt-2">
          <button
            onClick={onToggle}
            className={`w-full px-2.5 py-1.5 text-xs rounded-md transition-colors ${
              isExpanded
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isExpanded ? 'Hide Demo' : 'Show Demo'}
          </button>
          {isExpanded && (
            <div className="mt-2 aspect-video rounded-lg overflow-hidden">
              <iframe
                src={embedUrl}
                title={exercise.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ExerciseRow = ({ exercise, isExpanded, onToggle }: ExerciseRowProps) => {
  const hasVideo = exercise.videoId.length > 0;
  const embedUrl = hasVideo
    ? `https://www.youtube.com/embed/${exercise.videoId}${exercise.videoStart ? `?start=${exercise.videoStart}` : ''}`
    : '';

  return (
    <>
      <tr className="hover:bg-slate-700/40 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-slate-100 whitespace-nowrap">
          {exercise.name}
          {exercise.alternative && (
            <div className="text-[10px] text-slate-500 mt-0.5">Alt: {exercise.alternative}</div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
          <div>{exercise.sets}</div>
          <div className="text-xs text-slate-500">{exercise.reps}</div>
        </td>
        <td className="px-4 py-3">
          <TargetSummary targets={exercise.targets} />
        </td>
        <td className="px-4 py-3 text-center">
          {hasVideo ? (
            <button
              onClick={onToggle}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                isExpanded
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isExpanded ? 'Hide' : 'Preview'}
            </button>
          ) : (
            <span className="text-slate-600 text-xs">—</span>
          )}
        </td>
      </tr>

      {/* Expandable video row */}
      <tr>
        <td colSpan={4} className="p-0">
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 py-4 bg-slate-800/40">
              <div className="aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden">
                {isExpanded && (
                  <iframe
                    src={embedUrl}
                    title={exercise.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};

export const ExerciseTable = ({ exercises }: { exercises: Exercise[] }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // When there is no horizontal overflow this container should not capture
      // scroll events — forward them directly to the page so vertical scrolling
      // is uninterrupted regardless of where the cursor is.
      if (el.scrollWidth <= el.clientWidth) {
        e.preventDefault();
        window.scrollBy(0, e.deltaY);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg overflow-hidden">
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2 p-3">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            isExpanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div ref={tableScrollRef} className="hidden md:block overflow-x-auto overscroll-x-contain">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Exercise
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Sets / Reps
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Target Muscles
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-24">
                Demo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {exercises.map((ex, i) => (
              <ExerciseRow
                key={ex.name}
                exercise={ex}
                isExpanded={expandedIndex === i}
                onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
