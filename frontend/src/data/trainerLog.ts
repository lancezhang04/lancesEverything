/**
 * What she lifted last time, per movement.
 *
 * Deliberately expires after a week. This exists to answer one question at the
 * moment she's loading a machine — "what did I do last time?" — and a number
 * from a month ago answers it wrongly: it's the load from a body that has since
 * detrained, and double progression (§2) reads it as a target. No number is a
 * better prompt than a stale one.
 */

const KEY = 'trainer.log';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface LogEntry {
  /** Pounds. Null means she logged reps only. */
  weight: number | null;
  reps: number | null;
  /** Epoch ms. Entries older than TTL_MS are dropped on the next read. */
  at: number;
}

type Log = Record<string, LogEntry>;

const isEntry = (v: unknown): v is LogEntry => {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  const num = (x: unknown) => x === null || (typeof x === 'number' && Number.isFinite(x));
  return num(e.weight) && num(e.reps) && typeof e.at === 'number';
};

/** Reads the log, dropping anything past its week. Never throws. */
export const readLog = (): Log => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const cutoff = Date.now() - TTL_MS;
    const live: Log = {};
    for (const [movement, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (isEntry(entry) && entry.at > cutoff) live[movement] = entry;
    }
    return live;
  } catch {
    /* unparseable, or storage blocked — she just starts from a blank dial */
    return {};
  }
};

export const lastFor = (movement: string): LogEntry | null => readLog()[movement] ?? null;

/**
 * Writes one movement's numbers, pruning expired entries in the same pass so the
 * key can't grow without bound across blocks.
 */
export const record = (movement: string, weight: number | null, reps: number | null) => {
  try {
    const log = readLog();
    log[movement] = { weight, reps, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* private browsing — the set just isn't remembered */
  }
};
