import { ReactNode } from 'react';
import { Phase, Side } from '../../types/exchange';

export const money = (value: number | null | undefined) =>
  value === null || value === undefined
    ? '—'
    : `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`;

export const num = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : String(value);

const PHASE_STYLES: Record<Phase, string> = {
  QUOTING: 'bg-amber-900/50 text-amber-400',
  TRADING: 'bg-blue-900/50 text-blue-400',
  OPEN: 'bg-emerald-900/50 text-emerald-400',
  SETTLED: 'bg-slate-700 text-slate-400',
};

const PHASE_LABELS: Record<Phase, string> = {
  QUOTING: 'Making a market',
  TRADING: 'Trading',
  OPEN: 'Open — tallying',
  SETTLED: 'Settled',
};

export const PhaseBadge = ({ phase }: { phase: Phase }) => (
  <span className={`text-xs font-mono px-2 py-0.5 rounded whitespace-nowrap ${PHASE_STYLES[phase]}`}>
    {PHASE_LABELS[phase]}
  </span>
);

const SIDE_STYLES: Record<Side, string> = {
  BUY: 'bg-emerald-900/50 text-emerald-400',
  SELL: 'bg-red-900/50 text-red-400',
  MAKER: 'bg-blue-900/50 text-blue-400',
  PENDING: 'bg-slate-700 text-slate-500',
};

const SIDE_LABELS: Record<Side, string> = {
  BUY: 'LIFT',
  SELL: 'HIT',
  MAKER: 'MAKER',
  PENDING: 'PENDING',
};

export const SideBadge = ({ side }: { side: Side }) => (
  <span className={`text-xs font-mono px-2 py-0.5 rounded ${SIDE_STYLES[side]}`}>
    {SIDE_LABELS[side]}
  </span>
);

export const Pnl = ({ value }: { value: number | null }) => {
  if (value === null) return <span className="text-slate-500">—</span>;
  const tone = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-slate-300';
  return <span className={`font-medium ${tone}`}>{money(value)}</span>;
};

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg ${className}`}>
    {children}
  </div>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold text-slate-100 mb-3">{children}</h2>
);

export const ErrorNote = ({ message }: { message: string | null }) =>
  message ? (
    <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
      {message}
    </p>
  ) : null;

// No width here — callers set their own, since `w-full` would win over a `w-28`
// appended after it (Tailwind orders by generated CSS, not by string order).
export const inputClass =
  'bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 ' +
  'placeholder-slate-500 focus:outline-none focus:border-emerald-500';

export const buttonClass =
  'px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-40 ' +
  'disabled:cursor-not-allowed';

export const thClass =
  'px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider';
export const tdClass = 'px-4 py-3 whitespace-nowrap text-sm text-slate-100';
