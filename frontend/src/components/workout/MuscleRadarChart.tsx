import { useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { DayWorkout, aggregateActivations } from '../../data/workoutData';

type MuscleGroup = 'push' | 'pull' | 'lower';

const MUSCLE_GROUP: Record<string, MuscleGroup> = {
  'Chest — Sternal':      'push',
  'Chest — Clavicular':   'push',
  'Delts — Anterior':     'push',
  'Delts — Lateral':      'push',
  'Triceps — Long':       'push',
  'Triceps — Medial':     'push',
  'Triceps — Lateral':    'push',
  'Back — Lats':          'pull',
  'Back — Upper/Mid':     'pull',
  'Delts — Posterior':    'pull',
  'Biceps — Long':        'pull',
  'Biceps — Short':       'pull',
  'Quads — VL':              'lower',
  'Quads — VM':              'lower',
  'Quads — VI':              'lower',
  'Quads — RF':              'lower',
  'Glutes — Maximus':        'lower',
  'Glutes — Medius':         'lower',
  'Hamstrings — BF':         'lower',
  'Hamstrings — SM':         'lower',
  'Hamstrings — ST':         'lower',
  'Calves — Gastrocnemius':  'lower',
  'Calves — Soleus':         'lower',
};

// All heads in canonical order per category
const CATEGORY_HEADS: Record<MuscleGroup, string[]> = {
  push: [
    'Chest — Sternal', 'Chest — Clavicular',
    'Delts — Anterior', 'Delts — Lateral',
    'Triceps — Long', 'Triceps — Medial', 'Triceps — Lateral',
  ],
  pull: [
    'Back — Lats', 'Back — Upper/Mid',
    'Delts — Posterior',
    'Biceps — Long', 'Biceps — Short',
  ],
  lower: [
    'Quads — VL', 'Quads — VM', 'Quads — VI', 'Quads — RF',
    'Glutes — Maximus', 'Glutes — Medius',
    'Hamstrings — BF', 'Hamstrings — SM', 'Hamstrings — ST',
    'Calves — Gastrocnemius', 'Calves — Soleus',
  ],
};

// Muscle name → heads within that category (drives By-Group averaging denominator)
const CATEGORY_MUSCLE_HEADS: Record<MuscleGroup, Record<string, string[]>> = {
  push: {
    'Chest':   ['Chest — Sternal', 'Chest — Clavicular'],
    'Delts':   ['Delts — Anterior', 'Delts — Lateral'],
    'Triceps': ['Triceps — Long', 'Triceps — Medial', 'Triceps — Lateral'],
  },
  pull: {
    'Back':       ['Back — Lats', 'Back — Upper/Mid'],
    'Rear Delts': ['Delts — Posterior'],
    'Biceps':     ['Biceps — Long', 'Biceps — Short'],
  },
  lower: {
    'Quads':      ['Quads — VL', 'Quads — VM', 'Quads — VI', 'Quads — RF'],
    'Glutes':     ['Glutes — Maximus', 'Glutes — Medius'],
    'Hamstrings': ['Hamstrings — BF', 'Hamstrings — SM', 'Hamstrings — ST'],
    'Calves':     ['Calves — Gastrocnemius', 'Calves — Soleus'],
  },
};

const CATEGORY_ORDER: MuscleGroup[] = ['push', 'pull', 'lower'];

const GROUP_COLORS: Record<MuscleGroup, string> = {
  push:  '#f87171',
  pull:  '#60a5fa',
  lower: '#fb923c',
};


const LABEL_OFFSET = 14;

const makeTick = (chartCategory: MuscleGroup) => (props: any) => {
  const { cx, cy, x, y, payload, textAnchor } = props;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = cx + dx * (1 + LABEL_OFFSET / dist);
  const ny = cy + dy * (1 + LABEL_OFFSET / dist);
  const parts = payload.value.split(' — ');
  const LINE_H = 11;
  const startY = ny - ((parts.length - 1) * LINE_H) / 2;
  return (
    <text x={nx} textAnchor={textAnchor} fill={GROUP_COLORS[chartCategory]} fontSize={9}>
      {parts.map((part: string, i: number) => (
        <tspan key={i} x={nx} y={startY + i * LINE_H} dominantBaseline="central">
          {part}
        </tspan>
      ))}
    </text>
  );
};

// Compute the max display value across all categories for a given day so all
// charts on the same day share the same scale.
function computeDomainMax(
  byCategory: Partial<Record<MuscleGroup, Record<string, number>>>,
  presentCategories: MuscleGroup[],
  byGroup: boolean,
): number {
  let maxVal = 0;
  for (const cat of presentCategories) {
    const raw = byCategory[cat]!;
    const fullRaw: Record<string, number> = {};
    for (const head of CATEGORY_HEADS[cat]) fullRaw[head] = raw[head] ?? 0;

    const values = byGroup
      ? Object.entries(CATEGORY_MUSCLE_HEADS[cat]).map(([, heads]) =>
          heads.reduce((s, h) => s + (fullRaw[h] ?? 0), 0) / heads.length,
        )
      : Object.values(fullRaw);

    for (const v of values) if (v > maxVal) maxVal = v;
  }
  // Round up to the nearest multiple of 3 (clean ticks with tickCount=4), min 6
  return Math.max(6, Math.ceil(maxVal / 3) * 3);
}

interface SingleChartProps {
  raw: Record<string, number>;
  byGroup: boolean;
  chartCategory: MuscleGroup;
  domainMax: number;
}

const SingleChart = ({ raw, byGroup, chartCategory, domainMax }: SingleChartProps) => {
  // Build a complete raw that includes every head in this category (0 for untrained)
  const fullRaw: Record<string, number> = {};
  for (const head of CATEGORY_HEADS[chartCategory]) {
    fullRaw[head] = raw[head] ?? 0;
  }

  let displayRaw: Record<string, number>;
  let sortedKeys: string[];

  if (byGroup) {
    // Average over ALL heads per muscle within this category (including untrained zeros)
    const muscleHeads = CATEGORY_MUSCLE_HEADS[chartCategory];
    displayRaw = {};
    for (const [muscleName, heads] of Object.entries(muscleHeads)) {
      const sum = heads.reduce((acc, h) => acc + (fullRaw[h] ?? 0), 0);
      displayRaw[muscleName] = sum / heads.length;
    }
    sortedKeys = Object.keys(muscleHeads); // already in canonical order
  } else {
    displayRaw = fullRaw;
    sortedKeys = CATEGORY_HEADS[chartCategory]; // canonical head order
  }

  const data = sortedKeys.map((name) => ({
    name,
    push:  chartCategory === 'push'  ? displayRaw[name] : 0,
    pull:  chartCategory === 'pull'  ? displayRaw[name] : 0,
    lower: chartCategory === 'lower' ? displayRaw[name] : 0,
  }));

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={data}
          cx="50%" cy="50%"
          outerRadius="72%"
          margin={{ top: 24, right: 56, bottom: 24, left: 56 }}
        >
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="name" tick={makeTick(chartCategory)} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, domainMax]}
            tickCount={4}
            tick={{ fill: '#334155', fontSize: 9 }}
            axisLine={false}
          />
          <Radar name="Push"  dataKey="push"  stroke={GROUP_COLORS.push}  fill={GROUP_COLORS.push}  fillOpacity={0.22} strokeWidth={1.5} />
          <Radar name="Pull"  dataKey="pull"  stroke={GROUP_COLORS.pull}  fill={GROUP_COLORS.pull}  fillOpacity={0.22} strokeWidth={1.5} />
          <Radar name="Lower" dataKey="lower" stroke={GROUP_COLORS.lower} fill={GROUP_COLORS.lower} fillOpacity={0.22} strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface Props {
  dayData: DayWorkout;
}

export const MuscleRadarChart = ({ dayData }: Props) => {
  const [byGroup, setByGroup] = useState(true);
  const raw = aggregateActivations(dayData);
  if (Object.keys(raw).length === 0) return null;

  // Partition activated heads by category
  const byCategory: Partial<Record<MuscleGroup, Record<string, number>>> = {};
  for (const [head, val] of Object.entries(raw)) {
    const cat = MUSCLE_GROUP[head] ?? 'push';
    (byCategory[cat] ??= {})[head] = val;
  }
  const presentCategories = CATEGORY_ORDER.filter((c) => byCategory[c]);
  const isSplit = presentCategories.length > 1;
  const domainMax = computeDomainMax(byCategory, presentCategories, byGroup);

  return (
    <div className="bg-slate-950 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
          Daily Activation Summary
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs text-slate-400">
            {(['push', 'pull', 'lower'] as MuscleGroup[]).map((g) => (
              <span key={g} className="flex items-center gap-1.5 capitalize">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: GROUP_COLORS[g] }} />
                {g}
              </span>
            ))}
          </div>
          <button
            onClick={() => setByGroup((v) => !v)}
            className="text-xs px-2.5 py-1 rounded-md border border-blue-500 text-blue-400 bg-transparent hover:bg-blue-500/10 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            {byGroup ? 'By Group' : 'By Head'}
            <span className="text-[10px] leading-none">▾</span>
          </button>
        </div>
      </div>

      <div className={isSplit ? 'flex flex-col sm:flex-row sm:gap-4' : ''}>
        {presentCategories.map((cat) => (
          <div key={cat} className={isSplit ? 'flex-1' : ''}>
            {isSplit && (
              <p className="text-xs font-semibold capitalize text-center mb-1" style={{ color: GROUP_COLORS[cat] }}>
                {cat}
              </p>
            )}
            <SingleChart
              raw={byCategory[cat]!}
              byGroup={byGroup}
              chartCategory={cat}
              domainMax={domainMax}
            />
          </div>
        ))}
      </div>

      <p className="mt-1 text-xs text-slate-600 text-center whitespace-nowrap">
        {byGroup ? 'Avg. activation point per muscle' : 'Activation point per head'}
      </p>
    </div>
  );
};
