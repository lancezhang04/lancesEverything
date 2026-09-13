import { StepKind } from '../../types/trainer';

/**
 * The screen changes colour with what she's doing, so the mode reads from across
 * the squat rack without reading any words: amber is a working set, sky is rest,
 * slate is walking to the next machine.
 *
 * Written out per mode rather than composed from a string, because Tailwind only
 * emits classes it can see in the source.
 */
export interface ModeTheme {
  text: string;
  stroke: string;
  button: string;
  soft: string;
  rule: string;
  tick: string;
  chip: string;
}

export const MODE_THEME: Record<StepKind, ModeTheme> = {
  work: {
    text: 'text-amber-400',
    stroke: 'stroke-amber-400',
    button: 'bg-amber-500 text-slate-900 hover:bg-amber-400',
    soft: 'bg-amber-500/10',
    rule: 'bg-amber-500/40',
    tick: 'bg-amber-400',
    chip: 'bg-amber-500/15 text-amber-400',
  },
  rest: {
    text: 'text-sky-400',
    stroke: 'stroke-sky-400',
    button: 'bg-sky-500 text-slate-900 hover:bg-sky-400',
    soft: 'bg-sky-500/10',
    rule: 'bg-sky-500/40',
    tick: 'bg-sky-400',
    chip: 'bg-sky-500/15 text-sky-400',
  },
  move: {
    text: 'text-slate-400',
    stroke: 'stroke-slate-400',
    button: 'bg-slate-400 text-slate-900 hover:bg-slate-300',
    soft: 'bg-slate-500/10',
    rule: 'bg-slate-500/40',
    tick: 'bg-slate-400',
    chip: 'bg-slate-500/15 text-slate-400',
  },
};
