import { useCallback, useEffect, useMemo, useState } from 'react';
import { SESSION_IDS, buildSession, nextInQueue } from '../../data/trainerProgram';
import { SessionSummary } from '../../hooks/useSessionTimer';
import { SessionId } from '../../types/trainer';
import { armAudio, sessionOver } from '../../utils/gymCues';
import { SessionComplete } from './SessionComplete';
import { SessionRunner } from './SessionRunner';
import { SessionSetup } from './SessionSetup';

type Phase = 'setup' | 'running' | 'complete';

const LAST_SESSION_KEY = 'trainer.lastSession';

const readLastCompleted = (): SessionId | null => {
  try {
    const stored = localStorage.getItem(LAST_SESSION_KEY);
    return SESSION_IDS.find((id) => id === stored) ?? null;
  } catch {
    return null;
  }
};

/**
 * Block One, driven one step at a time. Press play in the gym and the page says
 * what to do right now; everything behind the programming stays in the doc.
 */
export const TrainerPage = () => {
  const [lastCompleted, setLastCompleted] = useState<SessionId | null>(readLastCompleted);
  const [sessionId, setSessionId] = useState<SessionId>(
    () => {
      const last = readLastCompleted();
      return last ? nextInQueue(last) : 'A';
    },
  );
  const [oneSetMode, setOneSetMode] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    document.title = "Lance's Trainer";
    return () => {
      document.title = "Lance's Everything";
    };
  }, []);

  const steps = useMemo(
    () => buildSession(sessionId, oneSetMode),
    [sessionId, oneSetMode],
  );

  const start = () => {
    armAudio(); // this tap is the gesture that unlocks audio for the rest of the session
    setSummary(null);
    setPhase('running');
  };

  const complete = useCallback(
    (result: SessionSummary) => {
      sessionOver();
      try {
        localStorage.setItem(LAST_SESSION_KEY, sessionId);
      } catch {
        /* private browsing — the queue just won't be remembered */
      }
      setLastCompleted(sessionId);
      setSummary(result);
      setPhase('complete');
    },
    [sessionId],
  );

  const restart = () => {
    setSessionId(nextInQueue(sessionId));
    setOneSetMode(false);
    setPhase('setup');
  };

  /* The whole module is a single-screen instrument: it claims the viewport
     exactly at every phase, drops the site footer and shrinks the masthead, so
     selection and a live session share one set of proportions. */

  return (
    <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden">
      <div className="sticky top-0 z-50 flex-none bg-slate-800/95 shadow-lg shadow-slate-900/50 backdrop-blur-sm">
        <div className="px-4 py-1.5 sm:px-10 sm:py-2 lg:px-16">
          <h1 className="text-slate-100">
            {/* Wordmark stays on the logo's line at every width, so the masthead
                reads "Lance's Trainer" on a phone. */}
            <div className="flex items-end gap-3">
              <a href="/">
                <img src="/lances-logo.svg" alt="Lance's" className="inline-block h-8 sm:h-10" />
              </a>
              <span className="text-lg sm:text-xl">Trainer</span>
            </div>
          </h1>
        </div>
      </div>

      <main className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col px-4 py-2 sm:px-6 sm:py-3 lg:px-8">
        {phase === 'setup' && (
          <SessionSetup
            sessionId={sessionId}
            onSelect={setSessionId}
            oneSetMode={oneSetMode}
            onOneSetModeChange={setOneSetMode}
            lastCompleted={lastCompleted}
            onStart={start}
          />
        )}
        {phase === 'running' && (
          <SessionRunner sessionId={sessionId} steps={steps} onComplete={complete} />
        )}
        {phase === 'complete' && summary && (
          <SessionComplete sessionId={sessionId} summary={summary} onRestart={restart} />
        )}
      </main>

    </div>
  );
};
