import { useState } from 'react';

type IntervalType = 'warmup' | 'work' | 'moderate' | 'rest' | 'recovery' | 'cooldown';

interface Interval {
  label: string;
  duration: number; // seconds
  type: IntervalType;
  repeat?: number;
}

// Flat sequence used only for the bar visualization — must be in actual temporal order
interface SeqBlock {
  duration: number;
  type: IntervalType;
}

interface HIITProtocol {
  name: string;
  subtitle: string;
  description: string;
  totalTime: string;
  intensity: string;
  intervals: Interval[];  // compact list for display
  sequence: SeqBlock[];   // interleaved order for the structure bar
  tips: string[];
}

const TYPE_STYLES: Record<IntervalType, { bar: string; dot: string }> = {
  warmup:   { bar: 'bg-orange-500',  dot: 'bg-orange-400'  },
  work:     { bar: 'bg-red-500',     dot: 'bg-red-400'     },
  moderate: { bar: 'bg-amber-500',   dot: 'bg-amber-400'   },
  rest:     { bar: 'bg-slate-600',   dot: 'bg-slate-500'   },
  recovery: { bar: 'bg-blue-800',    dot: 'bg-blue-600'    },
  cooldown: { bar: 'bg-blue-600',    dot: 'bg-blue-500'    },
};

const TYPE_LABEL: Record<IntervalType, string> = {
  warmup:   'Warm-up',
  work:     'Work',
  moderate: 'Moderate',
  rest:     'Easy / Active Rest',
  recovery: 'Recovery',
  cooldown: 'Cool-down',
};

const INTENSITY_COLOR: Record<string, string> = {
  'High':      'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Very High': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  'Maximum':   'text-red-400 bg-red-400/10 border-red-400/30',
};

// Helper: repeat a block pattern n times
function rep(n: number, blocks: SeqBlock[]): SeqBlock[] {
  return Array.from({ length: n }, () => blocks).flat();
}

const PROTOCOLS: HIITProtocol[] = [
  {
    name: 'Norwegian 4×4',
    subtitle: 'VO₂max Builder',
    description:
      '4 rounds of 4-minute high-intensity intervals at 90–95% max HR, separated by 3 minutes of active recovery. Developed by NTNU researchers and one of the most evidence-backed protocols for improving cardiovascular fitness and longevity.',
    totalTime: '~33 min',
    intensity: 'Very High',
    intervals: [
      { label: 'Warm-up',   duration: 600, type: 'warmup'             },
      { label: 'Interval',  duration: 240, type: 'work',   repeat: 4  },
      { label: 'Recovery',  duration: 240, type: 'rest',   repeat: 3  },
      { label: 'Cool-down', duration: 300, type: 'cooldown'            },
    ],
    sequence: [
      { duration: 600, type: 'warmup'   },
      { duration: 240, type: 'work'     },
      { duration: 240, type: 'rest'     },
      { duration: 240, type: 'work'     },
      { duration: 240, type: 'rest'     },
      { duration: 240, type: 'work'     },
      { duration: 240, type: 'rest'     },
      { duration: 240, type: 'work'     },
      { duration: 300, type: 'cooldown' },
    ],
    tips: [
      'Reach 90–95% max HR within the first 2 minutes of each interval',
      'Active recovery at ~60–70% max HR — light jog or brisk walk',
      'Works on treadmill, bike, rower, stair climber, or outdoors',
      'Once per week is sufficient; twice per week for advanced athletes',
    ],
  },
  {
    name: 'Tabata',
    subtitle: 'Anaerobic Capacity',
    description:
      '8 rounds of 20-second all-out effort followed by 10 seconds of rest — just 4 minutes of actual intervals. Developed by Dr. Izumi Tabata, this protocol simultaneously improves both aerobic and anaerobic capacity when performed at true maximum intensity.',
    totalTime: '~14 min',
    intensity: 'Maximum',
    intervals: [
      { label: 'Warm-up',   duration: 300, type: 'warmup'            },
      { label: 'Sprint',    duration: 20,  type: 'work',   repeat: 8 },
      { label: 'Rest',      duration: 10,  type: 'rest',   repeat: 8 },
      { label: 'Cool-down', duration: 300, type: 'cooldown'           },
    ],
    sequence: [
      { duration: 300, type: 'warmup'   },
      ...rep(8, [
        { duration: 20, type: 'work' },
        { duration: 10, type: 'rest' },
      ]),
      { duration: 300, type: 'cooldown' },
    ],
    tips: [
      'Must be truly all-out — if the last round feels manageable, you went too easy',
      'Classic choices: cycling, rowing, burpees, kettlebell swings, sprints',
      'Effective only when performed at maximum intensity throughout all 8 rounds',
      'Rest 2–3 days between sessions due to high CNS demand',
    ],
  },
  {
    name: 'Sprint 8',
    subtitle: 'Metabolic Conditioning',
    description:
      '8 sets of 30-second all-out sprints with 90 seconds of walking recovery. Designed to stimulate growth hormone release and improve metabolic rate. The longer recovery intervals allow full effort on every sprint.',
    totalTime: '~26 min',
    intensity: 'Maximum',
    intervals: [
      { label: 'Warm-up',   duration: 300, type: 'warmup'            },
      { label: 'Sprint',    duration: 30,  type: 'work',   repeat: 8 },
      { label: 'Walk',      duration: 90,  type: 'rest',   repeat: 8 },
      { label: 'Cool-down', duration: 300, type: 'cooldown'           },
    ],
    sequence: [
      { duration: 300, type: 'warmup'   },
      ...rep(8, [
        { duration: 30, type: 'work' },
        { duration: 90, type: 'rest' },
      ]),
      { duration: 300, type: 'cooldown' },
    ],
    tips: [
      'Sprint at 100% — the 90s recovery is intentionally longer to allow full effort each time',
      'Best on a track, treadmill, or stationary bike for controlled sprints',
      'Build from 4 sprints and progress to 8 over several weeks',
      'Avoid eating immediately after — GH release peaks 20–30 min post-session',
    ],
  },
  {
    name: '30-20-10',
    subtitle: 'Aerobic & Speed Development',
    description:
      'Continuous 5-minute blocks of alternating 30 seconds easy, 20 seconds moderate, and 10 seconds all-out. Developed by Danish researchers, this protocol improves VO₂max and running performance with lower perceived exertion than pure sprint intervals.',
    totalTime: '~20 min',
    intensity: 'High',
    intervals: [
      { label: 'Warm-up',            duration: 300, type: 'warmup'             },
      { label: 'Easy',               duration: 30,  type: 'rest',     repeat: 5 },
      { label: 'Moderate',           duration: 20,  type: 'moderate', repeat: 5 },
      { label: 'All-out sprint',     duration: 10,  type: 'work',     repeat: 5 },
      { label: 'Rest between blocks',duration: 120, type: 'recovery',  repeat: 2 },
      { label: 'Cool-down',          duration: 300, type: 'cooldown'            },
    ],
    sequence: [
      { duration: 300, type: 'warmup' },
      ...rep(5, [
        { duration: 30, type: 'rest'     },
        { duration: 20, type: 'moderate' },
        { duration: 10, type: 'work'     },
      ]),
      { duration: 120, type: 'recovery' },
      ...rep(5, [
        { duration: 30, type: 'rest'     },
        { duration: 20, type: 'moderate' },
        { duration: 10, type: 'work'     },
      ]),
      { duration: 120, type: 'recovery' },
      { duration: 300, type: 'cooldown' },
    ],
    tips: [
      'Perform 2–3 blocks of 5 min with 2 min passive rest between each block',
      'Easy = conversational pace; moderate = comfortably hard; sprint = all-out',
      'Great for runners — maintains running economy while adding speed work',
      'Lower CNS demand than Tabata; easier to recover from and sustain long-term',
    ],
  },
];

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem ? `${m}m ${rem}s` : `${m} min`;
}

function StructureBar({ sequence }: { sequence: SeqBlock[] }) {
  const total = sequence.reduce((s, b) => s + b.duration, 0);
  const uniqueTypes = Array.from(new Set(sequence.map(b => b.type))) as IntervalType[];

  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-3 gap-px">
        {sequence.map((b, i) => (
          <div
            key={i}
            className={`${TYPE_STYLES[b.type].bar} flex-shrink-0`}
            style={{ width: `${(b.duration / total) * 100}%` }}
            title={`${TYPE_LABEL[b.type]}: ${formatTime(b.duration)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {uniqueTypes.map(type => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${TYPE_STYLES[type].dot}`} />
            {TYPE_LABEL[type]}
          </span>
        ))}
      </div>
    </div>
  );
}

export const HIITCard = () => {
  const [selectedName, setSelectedName] = useState('Norwegian 4×4');
  const protocol = PROTOCOLS.find(p => p.name === selectedName) ?? PROTOCOLS[0];

  return (
    <div className="bg-slate-950 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
          HIIT Protocols
        </h2>
        <select
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          className="bg-slate-800 border border-blue-500/40 text-slate-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {PROTOCOLS.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Subtitle + stats chips */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm font-medium text-blue-400">{protocol.subtitle}</span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
          {protocol.totalTime}
        </span>
        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${INTENSITY_COLOR[protocol.intensity]}`}>
          {protocol.intensity} Intensity
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 leading-relaxed mb-6">
        {protocol.description}
      </p>

      {/* Structure bar — uses sequence for correct temporal order */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Structure
        </p>
        <StructureBar sequence={protocol.sequence} />
      </div>

      {/* Interval list */}
      <div className="divide-y divide-slate-800/60 mb-6">
        {protocol.intervals.map((iv, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TYPE_STYLES[iv.type].dot}`} />
            <span className="text-sm text-slate-300 flex-1">
              {iv.repeat ? `${iv.repeat}× ` : ''}{iv.label}
            </span>
            <span className="text-sm text-slate-500 tabular-nums">
              {formatTime(iv.duration)}{iv.repeat ? ' each' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Tips</p>
        <ul className="space-y-2">
          {protocol.tips.map((tip, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-400">
              <span className="text-blue-500 flex-shrink-0 mt-0.5">›</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
