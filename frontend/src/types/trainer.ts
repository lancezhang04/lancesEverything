export type SessionId = 'A' | 'B' | 'C';

/** What she's doing right now. Drives the accent colour of the whole screen. */
export type StepKind = 'work' | 'rest' | 'move';

export type SlotKey = 'warm' | 's1' | 's2' | 's3' | 's4';

export interface Step {
  slot: SlotKey;
  /** Shown as the eyebrow above the movement, e.g. "Slot 1 · Main lift". */
  slotLabel: string;
  kind: StepKind;
  name: string;
  /** Set count and rep target, or a note about what to do next. */
  sub?: string;
  /** Planned seconds. Actual time is measured separately so we can show drift. */
  secs: number;
  /** The one fault worth fixing on this movement (docs/isabel-block-one.md §9). */
  cue?: string;
  /** Slot 5 work that lives inside this rest period, if any. */
  fill?: string;
}

export interface Movement {
  name: string;
  cue: string;
}

/** Slot 5 work, which is prescribed by reps or seconds rather than by sets. */
export interface Accessory extends Movement {
  dose: string;
}

export interface SessionDef {
  /** Which pattern slot 1 protects on this day. */
  emphasis: string;
  slot1: Movement;
  slot2: Movement;
  slot3: Movement;
  slot4: Movement;
  /** Fills slot 2's rests. Present in every session — that dose is the non-negotiable. */
  abduction: Accessory;
  /** Fills slot 3's rests. Rotates so trunk work covers two functions, not one. */
  trunk: Accessory;
  /** Slot 1 is unilateral, so every working set costs roughly double. */
  unilateral: boolean;
}
