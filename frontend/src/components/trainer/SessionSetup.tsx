import {
  SESSION_IDS,
  SESSIONS,
  buildSession,
  nextInQueue,
  plannedSeconds,
  slotPreview,
} from '../../data/trainerProgram';
import { SessionId } from '../../types/trainer';

interface SessionSetupProps {
  sessionId: SessionId;
  onSelect: (id: SessionId) => void;
  oneSetMode: boolean;
  onOneSetModeChange: (value: boolean) => void;
  lastCompleted: SessionId | null;
  onStart: () => void;
}

export const SessionSetup = ({
  sessionId,
  onSelect,
  oneSetMode,
  onOneSetModeChange,
  lastCompleted,
  onStart,
}: SessionSetupProps) => {
  const minutes = Math.round(plannedSeconds(buildSession(sessionId, oneSetMode)) / 60);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-7">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl text-slate-100">Block One</h2>
        <p className="text-right text-xs leading-snug text-slate-500">
          {lastCompleted ? (
            <>
              Last done: <span className="text-slate-300">Session {lastCompleted}</span>
              <br />
              Next in the queue is {nextInQueue(lastCompleted)}
            </>
          ) : (
            <>
              A → B → C is a queue,
              <br />
              not a calendar
            </>
          )}
        </p>
      </div>

      <div>
        <p className="mb-2 text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
          Next in the queue
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SESSION_IDS.map((id) => {
            const selected = id === sessionId;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                aria-pressed={selected}
                className={`rounded-lg border px-2 py-2.5 text-center transition-colors ${
                  selected
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="text-xl font-semibold leading-none">{id}</div>
                <div
                  className={`mt-1 text-[0.7rem] ${selected ? 'text-amber-400/80' : 'text-slate-500'}`}
                >
                  {SESSIONS[id].emphasis}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The five slots in order — what she gets up front, and nothing else. */}
      <div className="border-t border-slate-700/60">
        {slotPreview(sessionId).map((slot) => (
          <div
            key={slot.n}
            className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-3 border-b border-slate-700/60 py-3"
          >
            <span className="text-xs text-slate-600">{slot.n}</span>
            <span>
              <span className={slot.pinned ? 'text-amber-400' : 'text-slate-200'}>
                {slot.movement}
              </span>
              {slot.note && (
                <span className="mt-0.5 block text-xs text-slate-500">{slot.note}</span>
              )}
            </span>
            <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">
              {slot.volume}
            </span>
          </div>
        ))}
      </div>

      {/* Cuts every slot to a single set — what the first session of a block
          should be, before her soreness response is known. */}
      <label
        htmlFor="trainer-one-set"
        className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-800/60 px-3.5 py-3"
      >
        <input
          id="trainer-one-set"
          type="checkbox"
          checked={oneSetMode}
          onChange={(e) => onOneSetModeChange(e.target.checked)}
          className="h-4 w-4 flex-none accent-amber-500"
        />
        <span className="text-sm text-slate-200">One set mode</span>
      </label>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <button
          onClick={onStart}
          className="w-full rounded-lg bg-amber-500 px-4 py-4 text-lg font-semibold uppercase tracking-wide text-slate-900 transition-colors hover:bg-amber-400"
        >
          Start session {sessionId}
        </button>
        <p className="text-center text-xs tabular-nums text-slate-500">
          About {minutes} minutes · {SESSIONS[sessionId].emphasis} emphasis
        </p>
      </div>
    </div>
  );
};
