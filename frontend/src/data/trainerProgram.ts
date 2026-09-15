import {
  Accessory,
  Movement,
  SessionDef,
  SessionId,
  SlotKey,
  Step,
} from '../types/trainer';

/**
 * Block One — a 3x/week full-body block for a returning athlete, 45 min hard cap.
 * The program itself lives in docs/isabel-block-one.md; this file is only the part a
 * timer needs. Section numbers below refer to that document.
 */

/*
 * Every movement carries three things: a one-liner she reads mid-set, an
 * optional deeper list she only sees if she taps it, and a demo video.
 *
 * The one-liner is the whole coaching budget for a working set — one fault,
 * phrased as something she can see happen, in words that need no translation.
 * That rules out the vocabulary a trainer reaches for by reflex: "beltline",
 * "ribs down", "neutral spine", "the sled". Anything that needs a definition
 * belongs in `more`, not in the line she reads with a dumbbell in each hand.
 */

const LEG_PRESS: Movement = {
  name: 'Leg press',
  cue: 'Feet just wider than your shoulders, knees tracking over your toes.',
  more: [
    "The sled is the padded platform your feet push against. It runs on fixed rails and has safety catches, so it can't come down on you.",
    'Lower until your knees are close to your chest, then push back. If your hips start rolling up off the seat and your lower back lifts away from the pad, that was too deep — come up an inch or two and stop there instead.',
    'Push through your whole foot, not just the balls of your feet.',
    "Stop just short of straight at the top. Don't snap your knees into a lock.",
  ],
  alternatives: ['Hack squat', 'Goblet squat', 'Barbell back squat'],
  video: 'https://www.youtube.com/watch?v=RbPmGoj6Db0',
};
const RDL: Movement = {
  name: 'Dumbbell Romanian deadlift',
  cue: 'Push your hips backward, dumbbells sliding down close to your legs.',
  more: [
    'Bend your knees slightly at the start, then keep them exactly that bent the whole way down. The movement happens at your hips, not your knees.',
    'Go down until you feel a strong stretch up the back of your thighs — usually somewhere around mid-shin. The stretch is the target, not the depth.',
    'If the dumbbells drift out away from your legs, your lower back ends up doing the work instead of your hamstrings.',
    'Back stays flat the whole time, never rounded.',
  ],
  alternatives: ['Barbell RDL', 'Single-leg RDL', 'Seated leg curl'],
  video: 'https://www.youtube.com/watch?v=aa57T45iFSE',
};
const SPLIT_SQUAT: Movement = {
  name: 'Dumbbell split squat',
  cue: 'Keep your hips level and your front knee pointing forward.',
  more: [
    'Your back knee drops straight down toward the floor, not forward.',
    'Most of your weight stays on the front foot the whole set.',
    'If your front knee drifts inward, or one hip dips lower than the other, the weight is too heavy — drop it.',
    'This is the one worth filming, from straight in front. Those two faults are obvious on camera and invisible from the inside.',
  ],
  alternatives: ['Rear-foot-elevated split squat', 'Walking lunge', 'Step-up'],
  video: 'https://www.youtube.com/watch?v=KvloZ_0wi_4',
};
/* The only knee flexion in the block — the RDL covers hip extension already (§5). */
const LEG_CURL: Movement = {
  name: 'Seated leg curl',
  cue: 'Glue your thighs to the seat and curl underneath you.',
  more: [
    "You sit upright with the pad across the backs of your ankles and another clamped over your thighs. Set the thigh pad snug — if your hips lift at the end of the curl, it's too loose.",
    'Curl your heels down and under you, then let it back out slowly. The way back out is where most of the work is.',
    'Seated rather than lying on purpose: sitting up bends your hips, which puts the hamstring on more stretch.',
    'If the outside of your knee starts talking, stop the set and tell me. It should not.',
  ],
  alternatives: ['Lying leg curl', 'Standing single-leg curl', '45° back extension'],
  video: 'https://www.youtube.com/watch?v=_2Kd0d-JEUM',
};

const CHEST_PRESS: Movement = {
  name: 'Chest press',
  cue: 'Pin your shoulder blades down before the first rep.',
  more: [
    'Set the seat so the handles line up with the middle of your chest.',
    'Stop just short of locking your elbows at the end of each push.',
  ],
  alternatives: ['Dumbbell bench press', 'Barbell bench press', 'Push-up'],
  video: 'https://www.youtube.com/watch?v=sqNwDkUU_Ps',
};
const INCLINE_PRESS: Movement = {
  name: 'Incline dumbbell press',
  cue: 'Pin your shoulder blades down. Lower the dumbbells to chest level.',
  more: [
    'Set the bench somewhere around 30–45°. Steeper than that turns it into a shoulder press.',
    'To get into position, sit with the dumbbells on your thighs and kick them up one at a time.',
    "Bring them down until they're level with the sides of your chest — that's the full range.",
    "Don't clash them together at the top.",
  ],
  alternatives: ['Incline machine press', 'Incline barbell press', 'Incline cable press'],
  video: 'https://www.youtube.com/watch?v=IP4oeKh1Sd4',
};
const OVERHEAD_PRESS: Movement = {
  name: 'Dumbbell overhead press',
  cue: "Keep your back flat — don't lean back to get the weight up.",
  more: [
    'Start with the dumbbells up at shoulder height, just outside your shoulders. Press from there until your arms are straight overhead, then bring them back down to your shoulders.',
    'Sitting with a back support makes it much easier to catch yourself leaning than standing does.',
    'If you have to lean back to finish a rep, the dumbbells are too heavy.',
  ],
  alternatives: ['Machine shoulder press', 'Seated barbell press', 'Landmine press'],
  video: 'https://www.youtube.com/watch?v=s_aK83TWYkA',
};
const LAT_PULLDOWN: Movement = {
  name: 'Lat pulldown',
  cue: 'Pull your elbows down to your ribs without leaning back.',
  more: [
    'A small backward lean is fine. Rocking backward to start each rep is not.',
    'Bring the bar down to your collarbone, then let it travel all the way back up until your arms are straight.',
    'Hands just outside shoulder width.',
  ],
  alternatives: ['Assisted pull-up', 'Neutral-grip pulldown', 'Single-arm pulldown'],
  video: 'https://www.youtube.com/watch?v=-c_TPoSUYuk',
};
const CABLE_ROW: Movement = {
  name: 'Seated cable row',
  cue: 'Keep your torso upright and still — only your arms move.',
  more: [
    'Lead with your elbows, pulling the handle in to your lower ribs.',
    'At the front of each rep let your shoulder blades stretch forward, then pull them back together as you row.',
    "If you're swinging backward to get the weight moving, drop it.",
  ],
  alternatives: ['Chest-supported row', 'Single-arm dumbbell row', 'Machine row'],
  video: 'https://www.youtube.com/watch?v=XaHV_8Nbyug',
};

/* Slot 1 for nobody — this is the calf work the block was missing entirely. */
const CALF_RAISE: Accessory = {
  name: 'Standing calf raise',
  dose: '12–15 reps',
  cue: 'Rise up as high as you can, then lower all the way back down.',
  more: [
    'Stand with the balls of your feet on a step or plate so your heels can drop below them at the bottom. That bottom stretch is most of the point.',
    'Keep your knees mostly straight.',
    'Slow up, slow down. No bouncing.',
    'Bodyweight is plenty to start. Hold a dumbbell in one hand when it gets easy.',
  ],
  alternatives: ['Seated calf raise', 'Leg press calf press', 'Single-leg calf raise'],
  video: 'https://www.youtube.com/watch?v=8sT7Ne3Kzwc',
};

const ABDUCTION_MACHINE: Accessory = {
  name: 'Hip abduction machine',
  dose: '12–15 reps',
  cue: 'Control it on the way back in.',
  more: [
    'The pads sit against the outside of your knees, not your shins.',
    'Leaning your chest forward a little shifts the work onto the side of your glute, which is the part this is for.',
    'Let the pads come back together over about three seconds instead of letting the stack drop.',
  ],
  alternatives: ['Cable hip abduction', 'Side-lying abduction', 'Banded lateral walk'],
  video: 'https://www.youtube.com/watch?v=MwXtApoiVEc',
};
/* Lateral delt was the one muscle group under the 4-set floor, at two (§18). */
const LATERAL_RAISE: Accessory = {
  name: 'DB lateral raise',
  dose: '12–15 reps',
  cue: 'Lead with your elbows, shoulders down away from your ears.',
  more: [
    'Light dumbbells. Lighter than you think — this is the one lift where going heavier makes it worse.',
    'Raise out to the side until your hands are about shoulder height, then lower them slowly.',
    'If your shoulders are creeping up toward your ears or the weight is swinging up, drop to a lighter pair.',
  ],
  alternatives: ['Cable lateral raise', 'Machine lateral raise', 'Plate front-and-out raise'],
  video: 'https://www.youtube.com/watch?v=ssAo_xwFt5c',
};
const SIDE_PLANK: Accessory = {
  name: 'Side plank',
  dose: '20–40s each side',
  cue: 'Keep your body in a straight line.',
  more: [
    'Elbow directly under your shoulder.',
    'If a full one is too hard, drop your bottom knee to the floor and hold that instead.',
  ],
  alternatives: ['Side plank from the knees', 'Suitcase carry', 'Copenhagen plank'],
  video: 'https://www.youtube.com/watch?v=XeN4pEZZJNI',
};
const DEAD_BUG: Accessory = {
  name: 'Dead bug',
  dose: '8–10 each side',
  cue: 'Keep your lower back planted on the floor.',
  more: [
    'Opposite arm and opposite leg reach out together, slowly.',
    "If your back lifts off the floor, don't reach as far. A shorter rep done flat beats a long one done arched.",
  ],
  alternatives: ['Bird dog', 'Pallof press', 'Hollow hold'],
  video: 'https://www.youtube.com/watch?v=g_BYB0R-4Ws',
};

/**
 * A, B and C are a queue, not a calendar (§2). The lower-body pair in A and B
 * swaps emphasis; everything else is a genuinely different session (§5).
 * Abduction holds two of the three days — enough to keep the dose (§3) without
 * spending every slot-5 rest on it. B trades its abduction round for calves,
 * the one thing no session in the block trained at all.
 *
 * C4 is a leg curl rather than a back extension, and A5 a lateral raise rather than
 * a side plank — the two coverage gaps the block otherwise left open (§5).
 */
export const SESSIONS: Record<SessionId, SessionDef> = {
  A: {
    emphasis: 'Squat',
    slot1: LEG_PRESS, slot2: CHEST_PRESS, slot3: LAT_PULLDOWN, slot4: RDL,
    slot2Fill: ABDUCTION_MACHINE, slot3Fill: LATERAL_RAISE, unilateral: false,
  },
  B: {
    emphasis: 'Hinge',
    slot1: RDL, slot2: INCLINE_PRESS, slot3: CABLE_ROW, slot4: LEG_PRESS,
    slot2Fill: CALF_RAISE, slot3Fill: DEAD_BUG, unilateral: false,
  },
  C: {
    emphasis: 'Single leg',
    slot1: SPLIT_SQUAT, slot2: OVERHEAD_PRESS, slot3: CABLE_ROW, slot4: LEG_CURL,
    slot2Fill: ABDUCTION_MACHINE, slot3Fill: SIDE_PLANK, unilateral: true,
  },
};

export const SESSION_IDS: SessionId[] = ['A', 'B', 'C'];

export const nextInQueue = (id: SessionId): SessionId =>
  SESSION_IDS[(SESSION_IDS.indexOf(id) + 1) % SESSION_IDS.length];

/** Weeks 1–2 run at 2–3 reps in reserve, tightening to 1–2 later (§2, §14.03). */
const RIR = '8–12 reps · leave 2–3 in the tank';

/** Copies a movement's coaching onto the step that's asking her to do it. */
const coaching = (m: Movement) => ({
  cue: m.cue,
  more: m.more,
  alternatives: m.alternatives,
  video: m.video,
});

/**
 * How many sets each slot gets. One source for both the session the timer runs
 * and the volumes the setup page lists, so the two can't drift apart.
 */
const setCounts = (oneSetMode: boolean) => ({
  workingSets: oneSetMode ? 1 : 3,
  accessorySets: oneSetMode ? 1 : 2,
  upperSets: oneSetMode ? 1 : 2,
});

/**
 * §6 budgets the session at ~32 minutes on paper. These intervals deliberately
 * spend the headroom and land at ~41, because finishing early is the correct
 * error and being rushed is the one that ends blocks.
 */
export function buildSession(id: SessionId, oneSetMode: boolean): Step[] {
  const s = SESSIONS[id];
  const steps: Step[] = [];
  const add = (step: Step) => steps.push(step);

  const { workingSets, accessorySets, upperSets } = setCounts(oneSetMode);

  /* Warm-up — identical every session (§5). Cardio only: the ramp-up sets in
     slot 1 are the movement prep, so a separate primer bought nothing. */
  add({
    slot: 'warm', slotLabel: 'Warm-up', kind: 'work', secs: 240,
    name: 'Easy cardio', sub: 'Rower, elliptical, or incline walk',
    cue: 'Conversational pace.',
    more: [
      "Conversational pace means you could hold a full conversation through it without running out of breath. If you couldn't, it's too hard — this is the easiest gear you have.",
      'Running is the one option to skip. The repeated impact is a common trigger for IT band irritation, which is the thing this whole block is built around avoiding.',
      'Four easy minutes warms the tissue and wakes up the signal between your brain and your muscles. Both make everything after it stronger and safer — it is not a workout of its own.',
    ],
  });

  /* Slot 1 — the only lift that gets full rest (§4, §14.05) */
  const l1 = s.slot1;
  add({
    slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'move', secs: 120,
    name: l1.name, sub: 'Set up — find it, load it', ...coaching(l1),
  });

  if (s.unilateral) {
    /* Three sets of split squats is really six working sets, so slot 1 trades
       ramp-up sets for longer ones and still lands on the same clock (§6). */
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 90,
      name: l1.name, sub: 'Ramp-up · bodyweight · 6 each leg', ...coaching(l1),
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 60,
      name: 'Rest', sub: 'Shake the legs out',
    });
    for (let i = 1; i <= workingSets; i++) {
      add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 120,
        name: l1.name, sub: `Working set ${i} of ${workingSets} · both legs · ${RIR}`,
        ...coaching(l1),
      });
      if (i < workingSets) add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 150,
        name: 'Full rest', sub: 'Slot 1 gets all the rest it wants',
      });
    }
  } else {
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 60,
      name: l1.name, sub: 'Ramp-up 1 · light · 8 reps', ...coaching(l1),
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 60,
      name: 'Rest', sub: 'Add weight for the next one',
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 60,
      name: l1.name, sub: 'Ramp-up 2 · moderate · 5 reps', ...coaching(l1),
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 75,
      name: 'Rest', sub: 'Load up to working weight',
    });
    for (let i = 1; i <= workingSets; i++) {
      add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 75,
        name: l1.name, sub: `Working set ${i} of ${workingSets} · ${RIR}`, ...coaching(l1),
      });
      if (i < workingSets) add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 165,
        name: 'Full rest', sub: 'Slot 1 gets all the rest it wants',
      });
    }
  }

  /* Slots 2 and 3 — the slot 5 work lives inside these rests, never slot 1's.
     Fatiguing the abductors before split squats would degrade exactly the
     frontal-plane control this program exists to protect (§4). */
  const upper: { key: SlotKey; label: string; lift: Movement; fill: Accessory; walk: number }[] = [
    { key: 's2', label: 'Slot 2 · Upper push', lift: s.slot2, fill: s.slot2Fill, walk: 120 },
    { key: 's3', label: 'Slot 3 · Upper pull', lift: s.slot3, fill: s.slot3Fill, walk: 90 },
  ];
  for (const { key, label, lift, fill, walk } of upper) {
    add({ slot: key, slotLabel: label, kind: 'move', secs: walk,
          name: lift.name, sub: 'Walk over and set up', ...coaching(lift) });
    for (let i = 1; i <= upperSets; i++) {
      add({
        slot: key, slotLabel: label, kind: 'work', secs: 75,
        name: lift.name, sub: `Set ${i} of ${upperSets} · ${RIR}`, ...coaching(lift),
      });
      add({
        slot: key, slotLabel: label, kind: 'rest', secs: 105,
        name: 'Rest', fill: `${fill.name} · ${fill.dose}`, ...coaching(fill),
      });
    }
  }

  /* Slot 4 — lower accessory, short rest */
  const l4 = s.slot4;
  add({
    slot: 's4', slotLabel: 'Slot 4 · Lower accessory', kind: 'move', secs: 90,
    name: l4.name, sub: 'Last one — set up', ...coaching(l4),
  });
  for (let i = 1; i <= accessorySets; i++) {
    add({
      slot: 's4', slotLabel: 'Slot 4 · Lower accessory', kind: 'work', secs: 75,
      name: l4.name, sub: `Set ${i} of ${accessorySets} · ${RIR}`, ...coaching(l4),
    });
    if (i < accessorySets) add({
      slot: 's4', slotLabel: 'Slot 4 · Lower accessory', kind: 'rest', secs: 105,
      name: 'Rest', sub: "Brisk — this one isn't protected",
    });
  }

  return steps;
}

export interface SlotPreview {
  n: string;
  movement: string;
  note?: string;
  volume: string;
  /** Slot 5 — the work that hides inside other slots' rests (§3). */
  pinned: boolean;
}

/** What she gets up front: the five slots in order, and nothing else (§15). */
export function slotPreview(id: SessionId, oneSetMode: boolean): SlotPreview[] {
  const s = SESSIONS[id];
  const { workingSets, accessorySets, upperSets } = setCounts(oneSetMode);
  const reps = (sets: number) => `${sets} × 8–12`;
  return [
    { n: '1', movement: s.slot1.name, note: 'Main lower lift', volume: reps(workingSets), pinned: false },
    { n: '2', movement: s.slot2.name, note: 'Upper push', volume: reps(upperSets), pinned: false },
    { n: '3', movement: s.slot3.name, note: 'Upper pull', volume: reps(upperSets), pinned: false },
    { n: '4', movement: s.slot4.name, note: 'Lower accessory', volume: reps(accessorySets), pinned: false },
    {
      n: '5',
      /* One round lives in each of slot 2's and slot 3's rests, so the count
         tracks the upper slots' set count. */
      movement: `${s.slot2Fill.name} + ${s.slot3Fill.name}`,
      note: 'Inside the rest of slots 2 & 3',
      volume: `${upperSets} each`,
      pinned: true,
    },
  ];
}

export const plannedSeconds = (steps: Step[]) =>
  steps.reduce((total, step) => total + step.secs, 0);
