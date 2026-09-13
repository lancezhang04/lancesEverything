import { SESSIONS, nextInQueue } from '../../data/trainerProgram';
import { SessionSummary } from '../../hooks/useSessionTimer';
import { SessionId } from '../../types/trainer';
import { formatClock } from '../../utils/formatters';

interface SessionCompleteProps {
  sessionId: SessionId;
  summary: SessionSummary;
  onRestart: () => void;
}

const DRIFT_DEADBAND = 20;

export const SessionComplete = ({ sessionId, summary, onRestart }: SessionCompleteProps) => {
  const upNext = nextInQueue(sessionId);
  const onTime = Math.abs(summary.delta) < DRIFT_DEADBAND;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 text-center">
      <div>
        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">
          Session complete
        </p>
        <h2 className="mt-1 text-3xl text-slate-100">That&rsquo;s one.</h2>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-700/60 ring-1 ring-slate-700/60">
        <div className="bg-slate-800/90 px-3 py-4">
          <p className="text-[0.6rem] uppercase tracking-[0.14em] text-slate-500">Time</p>
          <p className="mt-1 text-2xl tabular-nums text-slate-100">
            {formatClock(summary.elapsed)}
          </p>
        </div>
        <div className="bg-slate-800/90 px-3 py-4">
          <p className="text-[0.6rem] uppercase tracking-[0.14em] text-slate-500">vs. plan</p>
          <p
            className={`mt-1 text-2xl tabular-nums ${
              onTime ? 'text-slate-100' : summary.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {onTime ? '±0:00' : `${summary.delta > 0 ? '−' : '+'}${formatClock(summary.delta)}`}
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-400">
        Next time you train, run <span className="text-slate-200">Session {upNext}</span> —{' '}
        {SESSIONS[upNext].emphasis.toLowerCase()} emphasis.
      </p>

      <button
        onClick={onRestart}
        className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-slate-200 transition-colors hover:border-slate-600"
      >
        Back to start
      </button>
    </div>
  );
};
