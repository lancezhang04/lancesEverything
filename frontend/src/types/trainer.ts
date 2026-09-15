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
  /** Deeper notes, revealed only when she taps the cue. */
  more?: string[];
  /**
   * Storage key for this set's numbers, or absent if there's nothing to log.
   * Identifies the set, not just the movement — `Leg press|s1|work2` — so a
   * ramp-up and the working set it precedes keep separate weights, and the
   * same lift in two slots doesn't collide.
   */
  logKey?: string;
  /** Same job, different equipment — names only. */
  alternatives?: string[];
  /** Short form demo for the movement this step is about. */
  video?: string;
  /** Slot 5 work that lives inside this rest period, if any. */
  fill?: string;
}

export interface Movement {
  name: string;
  /**
   * The one-liner. Points at an effect she can see, never at a muscle, and
   * stays in words she already owns — no gym jargon (§9).
   */
  cue: string;
  /**
   * The second layer, behind a tap. Only for what is genuinely easy to get
   * wrong; a movement with nothing to add here simply omits it.
   */
  more?: string[];
  /**
   * Same job, different equipment. Names only — she's standing in a crowded rec
   * centre looking for something free, not reading a second program.
   */
  alternatives?: string[];
  /**
   * A short form demo. Required, so a movement can't enter the program without
   * one — every link here was checked against YouTube's oEmbed endpoint.
   */
  video: string;
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
  /**
   * Fills slot 2's rests. Abduction on two of the three days — that dose is the
   * non-negotiable (§3); the third day spends the slot elsewhere.
   */
  slot2Fill: Accessory;
  /** Fills slot 3's rests. Rotates so trunk work covers two functions, not one. */
  slot3Fill: Accessory;
  /** Slot 1 is unilateral, so every working set costs roughly double. */
  unilateral: boolean;
}
