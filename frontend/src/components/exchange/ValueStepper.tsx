import { useState } from 'react';
import { useExchangeAction } from '../../hooks/useExchange';
import { exchangeApi } from '../../services/exchangeApi';
import { buttonClass, inputClass, num } from './ui';

interface ValueStepperProps {
  productId: number;
  /** Admin steps the confirmed value; a player steps an unverified proposal. */
  isAdmin: boolean;
  currentValue: number | null;
  proposedValue: number | null;
  proposedBy: string | null;
}

/**
 * Counting is the common case during a live market ("that's another one"), so
 * −/+ are the primary controls and the text box is there for jumping straight
 * to a number.
 */
export const ValueStepper = ({
  productId,
  isAdmin,
  currentValue,
  proposedValue,
  proposedBy,
}: ValueStepperProps) => {
  const [draft, setDraft] = useState('');
  const step = useExchangeAction(exchangeApi.stepValue);
  const setValue = useExchangeAction(exchangeApi.setValue);
  const confirm = useExchangeAction(exchangeApi.confirmValue);

  const shown = isAdmin ? currentValue : proposedValue ?? currentValue;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => step.mutate([productId, -1])}
          className={`${buttonClass} bg-slate-700 text-slate-100 hover:bg-slate-600 w-10 text-center`}
          aria-label="Decrease by one"
        >
          −
        </button>
        <span className="text-xl text-slate-100 w-14 text-center tabular-nums">{num(shown)}</span>
        <button
          onClick={() => step.mutate([productId, 1])}
          className={`${buttonClass} bg-slate-700 text-slate-100 hover:bg-slate-600 w-10 text-center`}
          aria-label="Increase by one"
        >
          +
        </button>

        <input
          className={`${inputClass} w-24`}
          type="number"
          step="any"
          placeholder="Set to"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          disabled={draft === ''}
          onClick={() => setValue.mutate([productId, Number(draft)], { onSuccess: () => setDraft('') })}
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
        >
          Set
        </button>
      </div>

      {proposedValue !== null && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-900/50 text-amber-400">
            unverified {num(proposedValue)}
          </span>
          <span className="text-xs text-slate-500">
            counted by {proposedBy}
            {!isAdmin && ' — waiting on an admin to confirm'}
          </span>
          {isAdmin && (
            <button
              onClick={() => confirm.mutate([productId])}
              className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              Confirm {num(proposedValue)}
            </button>
          )}
        </div>
      )}

      {!isAdmin && proposedValue === null && (
        <p className="text-xs text-slate-500">
          Your count is unverified until an admin confirms it, so it won't move P&amp;L yet.
        </p>
      )}
    </div>
  );
};
