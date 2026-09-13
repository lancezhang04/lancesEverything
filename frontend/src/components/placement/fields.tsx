import type { ReactNode } from 'react';
import type { Provenance } from '../../types/placement';

export const inputClass =
  'bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-slate-100 ' +
  'placeholder-slate-500 focus:outline-none focus:border-cyan-500';

export const Panel = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <section className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-5 sm:p-6">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
      <h2 className="text-lg sm:text-xl font-semibold text-slate-100">{title}</h2>
      {subtitle && <span className="text-xs text-slate-500 font-mono">{subtitle}</span>}
    </div>
    {children}
  </section>
);

/** Label above, control below. Units live in the label, never in a tooltip. */
export const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <label className="flex flex-col gap-1 cursor-pointer">
    <span className="text-xs text-slate-400">
      {label}
      {hint && <span className="text-slate-600 ml-1">{hint}</span>}
    </span>
    {children}
  </label>
);

export const NumberInput = ({
  value,
  onChange,
  step = 1,
  min,
  max,
  width = 'w-full',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  width?: string;
}) => (
  <input
    type="number"
    className={`${inputClass} ${width} text-right tabular-nums`}
    value={Number.isFinite(value) ? value : 0}
    step={step}
    min={min}
    max={max}
    onChange={(e) => {
      const next = parseFloat(e.target.value);
      onChange(Number.isFinite(next) ? next : 0);
    }}
  />
);

/** Percent-valued input that edits a fraction. Stores 0.0495, shows 4.95. */
export const PercentInput = ({
  value,
  onChange,
  step = 0.01,
  decimals = 2,
  width = 'w-full',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  decimals?: number;
  width?: string;
}) => (
  <input
    type="number"
    className={`${inputClass} ${width} text-right tabular-nums`}
    value={parseFloat((value * 100).toFixed(decimals))}
    step={step}
    onChange={(e) => {
      const next = parseFloat(e.target.value);
      onChange(Number.isFinite(next) ? next / 100 : 0);
    }}
  />
);

const SOURCE_STYLE: Record<Provenance, string> = {
  fetched: 'bg-cyan-900/40 text-cyan-400 border-cyan-700/50',
  derived: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
  stated: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
  unsourced: 'bg-red-900/40 text-red-400 border-red-700/50',
};

/**
 * Provenance chip. `unsourced` is styled as an error so a guess can never
 * present itself as data.
 */
export const SourceTag = ({ source, note }: { source: Provenance; note?: string }) => (
  <span
    title={note || undefined}
    className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border ${SOURCE_STYLE[source]}`}
  >
    {source}
  </span>
);

/** Static formula block. Reference, not commentary. */
export const Formula = ({ children }: { children: ReactNode }) => (
  <pre className="text-[11px] sm:text-xs font-mono text-slate-400 leading-relaxed whitespace-pre overflow-x-auto">
    {children}
  </pre>
);

/** Symbol -> one-line definition. Definitional, not conversational. */
export const Glossary = ({ terms }: { terms: [string, string][] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] sm:text-xs">
    {terms.map(([symbol, meaning]) => (
      <div key={symbol} className="contents">
        <dt className="font-mono text-cyan-400 text-right">{symbol}</dt>
        <dd className="text-slate-400">{meaning}</dd>
      </div>
    ))}
  </dl>
);

export const bps = (fraction: number, decimals = 1) =>
  `${(fraction * 10_000).toFixed(decimals)} bp`;
