export interface MuscleActivation {
  muscle: string; // e.g. "Chest", "Delts", "Triceps"
  head: string;   // e.g. "Sternal", "Clavicular", "Long"
  rating: number; // 1-5
}

export interface Exercise {
  name: string;
  sets: string;       // e.g. "3 sets"
  reps: string;       // e.g. "8-12 reps"
  rest: string;       // e.g. "2:30"
  targets: MuscleActivation[];
  videoId: string;
  videoStart?: number; // seconds
  alternative?: string;
}

export interface DayWorkout {
  day: string;
  label: string;        // e.g. "Push + Zone 2"
  exercises: Exercise[];
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type Day = typeof DAYS[number];

export const workoutData: Record<Day, DayWorkout | null> = {
  Monday: {
    day: 'Monday',
    label: 'Push + Zone 2',
    exercises: [
      {
        name: 'Flat Bench Press',
        sets: '3 sets',
        reps: '8-12 reps',
        rest: '2:30',
        targets: [
          { muscle: 'Chest', head: 'Sternal', rating: 5 },
          { muscle: 'Chest', head: 'Clavicular', rating: 3 },
          { muscle: 'Delts', head: 'Anterior', rating: 3 },
          { muscle: 'Delts', head: 'Lateral', rating: 1 },
          { muscle: 'Triceps', head: 'Long', rating: 3 },
          { muscle: 'Triceps', head: 'Medial', rating: 2 },
          { muscle: 'Triceps', head: 'Lateral', rating: 2 },
        ],
        videoId: 'fGm-ef-4PVk',
        videoStart: 0,
        alternative: 'Machine Chest Press',
      },
      {
        name: 'Machine Chest Flys',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Chest', head: 'Sternal', rating: 5 },
          { muscle: 'Chest', head: 'Clavicular', rating: 2 },
          { muscle: 'Delts', head: 'Anterior', rating: 2 },
          { muscle: 'Delts', head: 'Lateral', rating: 1 },
          { muscle: 'Triceps', head: 'Long', rating: 1 },
          { muscle: 'Triceps', head: 'Medial', rating: 1 },
          { muscle: 'Triceps', head: 'Lateral', rating: 1 },
        ],
        videoId: 'fGm-ef-4PVk',
        videoStart: 669,
        alternative: 'Cable Crossover',
      },
      {
        name: 'Cable Lateral Raises',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Delts', head: 'Lateral', rating: 5 },
          { muscle: 'Delts', head: 'Anterior', rating: 2 },
          { muscle: 'Delts', head: 'Posterior', rating: 2 },
          { muscle: 'Back', head: 'Upper/Mid', rating: 3 },
        ],
        videoId: 'SgyUoY0IZ7A',
        videoStart: 477,
        alternative: 'Lean-In DB Lateral Raises',
      },
      {
        name: 'Overhead Cable Tricep Extensions',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Triceps', head: 'Long', rating: 5 },
          { muscle: 'Triceps', head: 'Medial', rating: 4 },
          { muscle: 'Triceps', head: 'Lateral', rating: 4 },
        ],
        videoId: 'OpRMRhr0Ycc',
        videoStart: 195,
        alternative: 'Modified Skull Crushers',
      },
      {
        name: 'Zone 2 Cardio',
        sets: '1',
        reps: '20-60 min',
        rest: '—',
        targets: [],
        videoId: '',
      },
    ],
  },

  Tuesday: {
    day: 'Tuesday',
    label: 'Pull + Zone 2',
    exercises: [
      {
        name: 'Wide-Grip Lat Pulldown',
        sets: '3 sets',
        reps: '8-12 reps',
        rest: '2:30',
        targets: [
          { muscle: 'Back', head: 'Lats', rating: 5 },
          { muscle: 'Back', head: 'Upper/Mid', rating: 3 },
          { muscle: 'Delts', head: 'Posterior', rating: 2 },
          { muscle: 'Biceps', head: 'Long', rating: 2 },
          { muscle: 'Biceps', head: 'Short', rating: 3 },
        ],
        videoId: 'jLvqKgW-_G8',
        alternative: 'Neutral-Grip Lat Pulldown',
      },
      {
        name: 'Chest-Supported Row',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Back', head: 'Lats', rating: 3 },
          { muscle: 'Back', head: 'Upper/Mid', rating: 5 },
          { muscle: 'Delts', head: 'Posterior', rating: 3 },
          { muscle: 'Biceps', head: 'Long', rating: 2 },
          { muscle: 'Biceps', head: 'Short', rating: 2 },
        ],
        videoId: 'jLvqKgW-_G8',
        alternative: 'Dumbbell Helms Row',
      },
      {
        name: 'Reverse Pec Deck',
        sets: '2-3 sets',
        reps: '12-15 reps',
        rest: '1:30-2:00',
        targets: [
          { muscle: 'Back', head: 'Lats', rating: 1 },
          { muscle: 'Back', head: 'Upper/Mid', rating: 3 },
          { muscle: 'Delts', head: 'Posterior', rating: 5 },
          { muscle: 'Biceps', head: 'Long', rating: 1 },
          { muscle: 'Biceps', head: 'Short', rating: 1 },
        ],
        videoId: 'SgyUoY0IZ7A',
        videoStart: 690,
        alternative: 'Rope Face Pulls',
      },
      {
        name: 'Bayesian Cable Curl',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Biceps', head: 'Long', rating: 5 },
          { muscle: 'Biceps', head: 'Short', rating: 3 },
        ],
        videoId: 'GNO4OtYoCYk',
        alternative: 'Incline DB Curl',
      },
      {
        name: 'Zone 2 Cardio',
        sets: '1',
        reps: '20-60 min',
        rest: '—',
        targets: [],
        videoId: '',
      },
    ],
  },

  Wednesday: {
    day: 'Wednesday',
    label: 'Legs',
    exercises: [
      {
        name: 'Hack Squat',
        sets: '3 sets',
        reps: '8-12 reps',
        rest: '2:30-3:00',
        targets: [
          { muscle: 'Quads', head: 'VL', rating: 5 },
          { muscle: 'Quads', head: 'VM', rating: 5 },
          { muscle: 'Quads', head: 'VI', rating: 5 },
          { muscle: 'Quads', head: 'RF', rating: 3 },
          { muscle: 'Hamstrings', head: 'BF', rating: 2 },
          { muscle: 'Hamstrings', head: 'SM', rating: 2 },
          { muscle: 'Hamstrings', head: 'ST', rating: 2 },
          { muscle: 'Glutes', head: 'Maximus', rating: 3 },
        ],
        videoId: 'kIXcoivzGf8',
        alternative: 'Leg Press',
      },
      {
        name: 'Romanian Deadlift',
        sets: '3 sets',
        reps: '8-12 reps',
        rest: '2:30-3:00',
        targets: [
          { muscle: 'Hamstrings', head: 'BF', rating: 5 },
          { muscle: 'Hamstrings', head: 'SM', rating: 5 },
          { muscle: 'Hamstrings', head: 'ST', rating: 5 },
          { muscle: 'Glutes', head: 'Maximus', rating: 4 },
          { muscle: 'Glutes', head: 'Medius', rating: 2 },
        ],
        videoId: '3ryh7PNhz3E',
        alternative: 'Stiff-Leg Deadlift',
      },
      {
        name: 'Leg Extension',
        sets: '2-3 sets',
        reps: '10-15 reps',
        rest: '2:00',
        targets: [
          { muscle: 'Quads', head: 'VL', rating: 4 },
          { muscle: 'Quads', head: 'VM', rating: 5 },
          { muscle: 'Quads', head: 'VI', rating: 4 },
          { muscle: 'Quads', head: 'RF', rating: 5 },
        ],
        videoId: 'kIXcoivzGf8',
        alternative: 'Reverse Nordic Curl',
      },
      {
        name: 'Standing Calf Raises',
        sets: '2-3 sets',
        reps: '10-15 reps',
        rest: '2:00',
        targets: [
          { muscle: 'Calves', head: 'Gastrocnemius', rating: 5 },
          { muscle: 'Calves', head: 'Soleus', rating: 2 },
        ],
        videoId: '',
        alternative: 'Leg Press Calf Raises',
      },
    ],
  },

  Thursday: {
    day: 'Thursday',
    label: 'Upper + Zone 2',
    exercises: [
      {
        name: 'Incline Dumbbell Press',
        sets: '3 sets',
        reps: '8-12 reps',
        rest: '2:30',
        targets: [
          { muscle: 'Chest', head: 'Clavicular', rating: 5 },
          { muscle: 'Chest', head: 'Sternal', rating: 3 },
          { muscle: 'Delts', head: 'Anterior', rating: 3 },
          { muscle: 'Delts', head: 'Lateral', rating: 1 },
          { muscle: 'Triceps', head: 'Long', rating: 2 },
          { muscle: 'Triceps', head: 'Medial', rating: 2 },
          { muscle: 'Triceps', head: 'Lateral', rating: 2 },
        ],
        videoId: 'fGm-ef-4PVk',
        alternative: 'Incline Bench Press',
      },
      {
        name: 'Seated Cable Row',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Back', head: 'Lats', rating: 3 },
          { muscle: 'Back', head: 'Upper/Mid', rating: 5 },
          { muscle: 'Delts', head: 'Posterior', rating: 2 },
          { muscle: 'Biceps', head: 'Long', rating: 2 },
          { muscle: 'Biceps', head: 'Short', rating: 2 },
        ],
        videoId: 'jLvqKgW-_G8',
        alternative: 'One-Arm Dumbbell Row',
      },
      {
        name: 'Cable Lateral Raises',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Delts', head: 'Lateral', rating: 5 },
          { muscle: 'Delts', head: 'Anterior', rating: 2 },
          { muscle: 'Delts', head: 'Posterior', rating: 2 },
        ],
        videoId: 'SgyUoY0IZ7A',
        videoStart: 477,
        alternative: 'Lean-In DB Lateral Raises',
      },
      {
        name: 'Bayesian Cable Curl',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Biceps', head: 'Long', rating: 5 },
          { muscle: 'Biceps', head: 'Short', rating: 3 },
        ],
        videoId: 'GNO4OtYoCYk',
        alternative: 'Incline DB Curl',
      },
      {
        name: 'Zone 2 Cardio',
        sets: '1',
        reps: '20-60 min',
        rest: '—',
        targets: [],
        videoId: '',
      },
    ],
  },

  Friday: {
    day: 'Friday',
    label: 'Lower Posterior Chain',
    exercises: [
      {
        name: 'Bulgarian Split Squat',
        sets: '3 sets',
        reps: '8-12 reps',
        rest: '2:30',
        targets: [
          { muscle: 'Quads', head: 'VL', rating: 4 },
          { muscle: 'Quads', head: 'VM', rating: 4 },
          { muscle: 'Quads', head: 'VI', rating: 4 },
          { muscle: 'Quads', head: 'RF', rating: 3 },
          { muscle: 'Glutes', head: 'Maximus', rating: 4 },
          { muscle: 'Glutes', head: 'Medius', rating: 3 },
          { muscle: 'Hamstrings', head: 'BF', rating: 2 },
          { muscle: 'Hamstrings', head: 'SM', rating: 2 },
          { muscle: 'Hamstrings', head: 'ST', rating: 2 },
        ],
        videoId: 'kIXcoivzGf8',
        alternative: 'Walking Lunges',
      },
      {
        name: 'Seated Hamstring Curl',
        sets: '2-3 sets',
        reps: '8-12 reps',
        rest: '2:00-2:30',
        targets: [
          { muscle: 'Hamstrings', head: 'BF', rating: 5 },
          { muscle: 'Hamstrings', head: 'SM', rating: 5 },
          { muscle: 'Hamstrings', head: 'ST', rating: 5 },
          { muscle: 'Calves', head: 'Gastrocnemius', rating: 2 },
        ],
        videoId: 'XFpT41748hM',
        alternative: 'Lying Hamstring Curl',
      },
      {
        name: 'Machine Hip Abduction',
        sets: '2-3 sets',
        reps: '12-15 reps',
        rest: '1:30-2:00',
        targets: [
          { muscle: 'Glutes', head: 'Medius', rating: 5 },
          { muscle: 'Glutes', head: 'Maximus', rating: 2 },
        ],
        videoId: '3ryh7PNhz3E',
        alternative: 'Cable Hip Abduction',
      },
      {
        name: 'Seated Calf Raises',
        sets: '2-3 sets',
        reps: '10-15 reps',
        rest: '2:00',
        targets: [
          { muscle: 'Calves', head: 'Soleus', rating: 5 },
          { muscle: 'Calves', head: 'Gastrocnemius', rating: 2 },
        ],
        videoId: '',
        alternative: 'Smith Machine Seated Calf Raises',
      },
    ],
  },

  Saturday: null,

  Sunday: {
    day: 'Sunday',
    label: 'Zone 4/5 HIIT',
    exercises: [
      {
        name: 'Zone 4/5 HIIT',
        sets: '1',
        reps: '20-30 min',
        rest: '—',
        targets: [],
        videoId: '',
      },
    ],
  },
};

/**
 * Aggregate all muscle head activations for a given day's workout.
 * Returns { "Chest — Sternal": 10, "Delts — Lateral": 6, ... }
 */
export function aggregateActivations(day: DayWorkout): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const ex of day.exercises) {
    for (const t of ex.targets) {
      const key = `${t.muscle} — ${t.head}`;
      totals[key] = (totals[key] || 0) + t.rating;
    }
  }
  return totals;
}
