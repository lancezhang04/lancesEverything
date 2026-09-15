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

/* Cues are the "fix this first" column of §9 — one fault per movement, each
   pointing at an effect in the world so she can check it herself on video. */

const LEG_PRESS: Movement = {
  name: 'Leg press',
  cue: 'Stop the sled before your hips start to curl under.',
};
const RDL: Movement = {
  name: 'Dumbbell Romanian deadlift',
  cue: 'Push your hips back toward the wall behind you.',
};
const SPLIT_SQUAT: Movement = {
  name: 'Dumbbell split squat',
  cue: 'Point that knee at your second toe. Beltline stays level.',
};
const BACK_EXTENSION: Movement = {
  name: '45° back extension',
  // §9 has no row for this one yet — cue written to match the others' pattern.
  cue: 'Stop when your body makes a straight line. No arching past it.',
};

const CHEST_PRESS: Movement = {
  name: 'Chest press',
  cue: 'Pin your shoulder blades down before the first rep.',
};
const INCLINE_PRESS: Movement = {
  name: 'Incline dumbbell press',
  cue: 'Pin your shoulder blades down before the first rep.',
};
const OVERHEAD_PRESS: Movement = {
  name: 'Dumbbell overhead press',
  cue: 'Ribs down, squeeze your glutes, press to the ceiling.',
};
const LAT_PULLDOWN: Movement = {
  name: 'Lat pulldown',
  cue: 'Chest tall, drive your elbows down to your ribs.',
};
const CABLE_ROW: Movement = {
  name: 'Seated cable row',
  cue: 'Lead with your elbows, chest stays tall.',
};

const ABDUCTION_MACHINE: Accessory = {
  name: 'Hip abduction machine',
  dose: '12–15 reps',
  // Also not in §9; the machine's one real failure mode is dropping the stack.
  cue: "Control it on the way back in — that's the half that counts.",
};
const SIDE_LYING_ABDUCTION: Accessory = {
  name: 'Side-lying abduction',
  dose: '12–15 reps each side',
  cue: 'Heel leads, toes tipped slightly down.',
};
const SIDE_PLANK: Accessory = {
  name: 'Side plank',
  dose: '20–40s each side',
  cue: 'Push the floor away and lift your bottom hip.',
};
const DEAD_BUG: Accessory = {
  name: 'Dead bug',
  dose: '8–10 each side',
  cue: 'Keep your low back glued to the floor the whole time.',
};

/**
 * A, B and C are a queue, not a calendar (§2). The lower-body pair in A and B
 * swaps emphasis; everything else is a genuinely different session (§5).
 * Abduction appears in all three — that dose is the non-negotiable (§3).
 */
export const SESSIONS: Record<SessionId, SessionDef> = {
  A: {
    emphasis: 'Squat',
    slot1: LEG_PRESS, slot2: CHEST_PRESS, slot3: LAT_PULLDOWN, slot4: RDL,
    abduction: ABDUCTION_MACHINE, trunk: SIDE_PLANK, unilateral: false,
  },
  B: {
    emphasis: 'Hinge',
    slot1: RDL, slot2: INCLINE_PRESS, slot3: CABLE_ROW, slot4: LEG_PRESS,
    abduction: SIDE_LYING_ABDUCTION, trunk: DEAD_BUG, unilateral: false,
  },
  C: {
    emphasis: 'Single leg',
    slot1: SPLIT_SQUAT, slot2: OVERHEAD_PRESS, slot3: CABLE_ROW, slot4: BACK_EXTENSION,
    abduction: ABDUCTION_MACHINE, trunk: SIDE_PLANK, unilateral: true,
  },
};

export const SESSION_IDS: SessionId[] = ['A', 'B', 'C'];

export const nextInQueue = (id: SessionId): SessionId =>
  SESSION_IDS[(SESSION_IDS.indexOf(id) + 1) % SESSION_IDS.length];

/** Weeks 1–2 run at 2–3 reps in reserve, tightening to 1–2 later (§2, §14.03). */
const RIR = '8–12 reps · 2–3 RIR';

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
 * §6 budgets the session at ~34 minutes on paper. These intervals deliberately
 * spend the headroom and land at ~44, because finishing early is the correct
 * error and being rushed is the one that ends blocks.
 */
export function buildSession(id: SessionId, oneSetMode: boolean): Step[] {
  const s = SESSIONS[id];
  const steps: Step[] = [];
  const add = (step: Step) => steps.push(step);

  const { workingSets, accessorySets, upperSets } = setCounts(oneSetMode);

  /* Warm-up — identical every session (§5) */
  add({
    slot: 'warm', slotLabel: 'Warm-up', kind: 'work', secs: 240,
    name: 'Easy cardio', sub: 'Rower, elliptical, or incline walk',
    cue: 'Conversational pace. This is prep, not training.',
  });
  add({
    slot: 'warm', slotLabel: 'Warm-up', kind: 'move', secs: 90,
    name: 'Grab a band', sub: 'Head for the open floor',
  });
  add({
    slot: 'warm', slotLabel: 'Warm-up', kind: 'work', secs: 90,
    name: 'Banded lateral walks', sub: 'One set · 15 steps each way',
    cue: 'Stay in a quarter squat and never let the band go quiet.',
  });

  /* Slot 1 — the only lift that gets full rest (§4, §14.05) */
  const l1 = s.slot1;
  add({
    slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'move', secs: 120,
    name: l1.name, sub: 'Set up — find it, load it',
  });

  if (s.unilateral) {
    /* Three sets of split squats is really six working sets, so slot 1 trades
       ramp-up sets for longer ones and still lands on the same clock (§6). */
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 90,
      name: l1.name, sub: 'Ramp-up · bodyweight · 6 each leg', cue: l1.cue,
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 60,
      name: 'Rest', sub: 'Shake the legs out',
    });
    for (let i = 1; i <= workingSets; i++) {
      add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 120,
        name: l1.name, sub: `Working set ${i} of ${workingSets} · both legs · ${RIR}`,
        cue: l1.cue,
      });
      if (i < workingSets) add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 150,
        name: 'Full rest', sub: 'Slot 1 gets all the rest it wants',
      });
    }
  } else {
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 60,
      name: l1.name, sub: 'Ramp-up 1 · light · 8 reps', cue: l1.cue,
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 60,
      name: 'Rest', sub: 'Add weight for the next one',
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 60,
      name: l1.name, sub: 'Ramp-up 2 · moderate · 5 reps', cue: l1.cue,
    });
    add({
      slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 75,
      name: 'Rest', sub: 'Load up to working weight',
    });
    for (let i = 1; i <= workingSets; i++) {
      add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'work', secs: 75,
        name: l1.name, sub: `Working set ${i} of ${workingSets} · ${RIR}`, cue: l1.cue,
      });
      if (i < workingSets) add({
        slot: 's1', slotLabel: 'Slot 1 · Main lift', kind: 'rest', secs: 165,
        name: 'Full rest', sub: 'Slot 1 gets all the rest it wants',
      });
    }
  }

  /* Slots 2 and 3 — the abductor and trunk work lives inside these rests, never
     slot 1's. Fatiguing the abductors before split squats would degrade exactly
     the frontal-plane control this program exists to protect (§4). */
  const upper: { key: SlotKey; label: string; lift: Movement; fill: Accessory; walk: number }[] = [
    { key: 's2', label: 'Slot 2 · Upper push', lift: s.slot2, fill: s.abduction, walk: 120 },
    { key: 's3', label: 'Slot 3 · Upper pull', lift: s.slot3, fill: s.trunk, walk: 90 },
  ];
  for (const { key, label, lift, fill, walk } of upper) {
    add({ slot: key, slotLabel: label, kind: 'move', secs: walk,
          name: lift.name, sub: 'Walk over and set up' });
    for (let i = 1; i <= upperSets; i++) {
      add({
        slot: key, slotLabel: label, kind: 'work', secs: 75,
        name: lift.name, sub: `Set ${i} of ${upperSets} · ${RIR}`, cue: lift.cue,
      });
      add({
        slot: key, slotLabel: label, kind: 'rest', secs: 105,
        name: 'Rest', fill: `${fill.name} · ${fill.dose}`, cue: fill.cue,
      });
    }
  }

  /* Slot 4 — lower accessory, short rest */
  const l4 = s.slot4;
  add({
    slot: 's4', slotLabel: 'Slot 4 · Lower accessory', kind: 'move', secs: 90,
    name: l4.name, sub: 'Last one — set up',
  });
  for (let i = 1; i <= accessorySets; i++) {
    add({
      slot: 's4', slotLabel: 'Slot 4 · Lower accessory', kind: 'work', secs: 75,
      name: l4.name, sub: `Set ${i} of ${accessorySets} · ${RIR}`, cue: l4.cue,
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
  /** The two that never rotate — the IT band work (§3). */
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
      movement: `${s.abduction.name} + ${s.trunk.name}`,
      note: 'Inside the rest of slots 2 & 3',
      volume: `${upperSets} each`,
      pinned: true,
    },
  ];
}

export const plannedSeconds = (steps: Step[]) =>
  steps.reduce((total, step) => total + step.secs, 0);
