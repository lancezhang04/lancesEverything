import { useCallback, useEffect, useMemo, useState } from 'react';
import { Footer } from '../layout/Footer';
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

  return (
    <div style={{ minHeight: '100dvh' }} className="relative z-10 flex flex-col">
      <div className="sticky top-0 z-50 bg-slate-800/95 shadow-lg shadow-slate-900/50 backdrop-blur-sm">
        <div className="px-4 py-3 sm:px-10 sm:py-4 lg:px-16">
          <h1 className="text-slate-100">
            <div className="flex items-end gap-3">
              <a href="/">
                <img src="/lances-logo.svg" alt="Lance's" className="inline-block h-12 sm:h-[3.2rem]" />
              </a>
              <span className="hidden text-3xl sm:inline">Trainer</span>
            </div>
            <span className="mt-1 block text-lg sm:hidden">Trainer</span>
          </h1>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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

      <Footer />
    </div>
  );
};
