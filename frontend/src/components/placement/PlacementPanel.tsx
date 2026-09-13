import type { PlacementRequest, PlacementResponse, Strategy } from '../../types/placement';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Field, Formula, NumberInput, Panel, PercentInput, bps } from './fields';

interface PlacementPanelProps {
  request: PlacementRequest;
  result: PlacementResponse | null;
  onChange: (next: PlacementRequest) => void;
}

const money = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const AllocationGrid = ({
  strategy,
  request,
  tickers,
}: {
  strategy: Strategy;
  request: PlacementRequest;
  tickers: string[];
}) => {
  const cell = (account: string, ticker: string) =>
    strategy.cells
      .filter((c) => c.account === account && c.ticker === ticker)
      .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700">
            <th className="text-left font-medium py-1.5 pr-2">Account</th>
            {tickers.map((t) => (
              <th key={t} className="text-right font-medium py-1.5 px-2">
                {t}
              </th>
            ))}
            <th className="text-right font-medium py-1.5 pl-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {request.accounts.map((account) => {
            const rowTotal = tickers.reduce((s, t) => s + cell(account.name, t), 0);
            return (
              <tr key={account.name} className="border-b border-slate-700/40">
                <td className="py-1.5 pr-2">
                  <span
                    className={
                      account.character === 'sheltered' ? 'text-cyan-400' : 'text-amber-400'
                    }
                  >
                    {account.name}
                  </span>
                </td>
                {tickers.map((t) => (
                  <td key={t} className="py-1.5 px-2 text-right text-slate-300">
                    {money(cell(account.name, t))}
                  </td>
                ))}
                <td className="py-1.5 pl-2 text-right text-slate-400">{money(rowTotal)}</td>
              </tr>
            );
          })}
          <tr className="text-slate-400">
            <td className="py-1.5 pr-2">Total</td>
            {tickers.map((t) => (
              <td key={t} className="py-1.5 px-2 text-right">
                {money(
                  request.accounts.reduce((s, a) => s + cell(a.name, t), 0),
                )}
              </td>
            ))}
            <td className="py-1.5 pl-2 text-right">
              {money(strategy.cells.reduce((s, c) => s + c.amount, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const PlacementPanel = ({ request, result, onChange }: PlacementPanelProps) => {
  const tickers = request.funds.map((f) => f.ticker);

  const patchAccount = (name: string, amount: number) =>
    onChange({
      ...request,
      accounts: request.accounts.map((a) => (a.name === name ? { ...a, amount } : a)),
    });

  const patchSplit = (ticker: string, weight: number) =>
    onChange({ ...request, target_split: { ...request.target_split, [ticker]: weight } });

  const splitSum = Object.values(request.target_split).reduce((a, b) => a + b, 0);

  return (
    <Panel title="Vanilla vs optimal placement" subtitle="annual contributions">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-5">
        {/* Contributions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {request.accounts.map((account) => (
            <Field
              key={account.name}
              label={account.name}
              hint={account.character === 'sheltered' ? '· sheltered' : '· taxable'}
            >
              <NumberInput
                value={account.amount}
                step={500}
                min={0}
                onChange={(v) => patchAccount(account.name, v)}
              />
            </Field>
          ))}
        </div>

        {/* Target split */}
        <div>
          <div className="grid grid-cols-3 gap-3">
            {tickers.map((ticker) => (
              <Field key={ticker} label={ticker} hint="%">
                <PercentInput
                  value={request.target_split[ticker] ?? 0}
                  step={1}
                  onChange={(v) => patchSplit(ticker, v)}
                />
              </Field>
            ))}
          </div>
          <div
            className={`mt-2 text-xs font-mono ${
              Math.abs(splitSum - 1) < 1e-6 ? 'text-slate-500' : 'text-red-400'
            }`}
          >
            Σ {formatPercent(splitSum)}
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Capacities and targets */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-slate-300 border-y border-slate-700/50 py-3 mb-5">
            <span>
              <span className="text-slate-500">total</span>{' '}
              {money(result.total_contributions)}
            </span>
            <span className="text-cyan-400">
              <span className="text-slate-500">sheltered</span>{' '}
              {money(result.sheltered_capacity)} ({formatPercent(result.sheltered_share, 1)})
            </span>
            <span className="text-amber-400">
              <span className="text-slate-500">taxable</span>{' '}
              {money(result.taxable_capacity)}
            </span>
            {tickers.map((t) => (
              <span key={t}>
                <span className="text-slate-500">{t} target</span>{' '}
                {money(result.fund_targets[t] ?? 0)}
              </span>
            ))}
          </div>

          {/* Both allocations */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {([result.vanilla, result.optimal] as Strategy[]).map((strategy) => (
              <div key={strategy.name}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-200">{strategy.name}</h3>
                  <span className="text-xs font-mono text-slate-400">
                    {formatCurrency(strategy.annual_drag)}/yr ·{' '}
                    {strategy.drag_bps.toFixed(2)} bp
                  </span>
                </div>
                <AllocationGrid strategy={strategy} request={request} tickers={tickers} />
              </div>
            ))}
          </div>

          {/* Saving, and the two independent routes to it */}
          <div className="mt-5 border-t border-slate-700/50 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-slate-400 text-sm">Saving</span>
                <span className="text-2xl font-semibold text-cyan-400 tabular-nums">
                  {formatCurrency(result.annual_saving)}
                </span>
                <span className="text-sm text-slate-400 font-mono">
                  /yr · {result.saving_bps.toFixed(2)} bp
                </span>
              </div>
              <div className="mt-2 text-xs font-mono">
                <span className="text-slate-500">direct</span>{' '}
                <span className="text-slate-300">
                  {formatCurrency(result.saving_check.direct)}
                </span>
                <span className="text-slate-600 mx-2">·</span>
                <span className="text-slate-500">decomposed</span>{' '}
                <span className="text-slate-300">
                  {formatCurrency(result.saving_check.decomposed)}
                </span>
                <span
                  className={`ml-2 ${
                    result.saving_check.agree ? 'text-slate-500' : 'text-red-400'
                  }`}
                >
                  {result.saving_check.agree ? '✓' : '✗ mismatch'}
                </span>
              </div>
            </div>

            <div>
              <Formula>
                {`fund_target_i = split_i · total          (hard constraint)
vanilla       = every account holds the split
optimal       = fill shelter, highest benefit first

saving = Σ benefit_i · (shelt_opt_i − shelt_van_i)`}
              </Formula>
            </div>
          </div>

          {/* Per-fund contribution to the saving */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left font-medium py-1.5 pr-2">Fund</th>
                  <th className="text-right font-medium py-1.5 px-2">Benefit</th>
                  <th className="text-right font-medium py-1.5 px-2">Vanilla shelt.</th>
                  <th className="text-right font-medium py-1.5 px-2">Optimal shelt.</th>
                  <th className="text-right font-medium py-1.5 px-2">Δ</th>
                  <th className="text-right font-medium py-1.5 pl-2">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {result.drags.map((d) => {
                  const van = result.vanilla.sheltered[d.ticker] ?? 0;
                  const opt = result.optimal.sheltered[d.ticker] ?? 0;
                  const delta = opt - van;
                  return (
                    <tr key={d.ticker} className="border-b border-slate-700/40">
                      <td className="py-1.5 pr-2 text-slate-100">{d.ticker}</td>
                      <td className="py-1.5 px-2 text-right text-slate-400">
                        {bps(d.benefit)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-400">{money(van)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-400">{money(opt)}</td>
                      <td
                        className={`py-1.5 px-2 text-right ${
                          delta >= 0 ? 'text-cyan-400' : 'text-amber-400'
                        }`}
                      >
                        {delta >= 0 ? '+' : ''}
                        {money(delta)}
                      </td>
                      <td
                        className={`py-1.5 pl-2 text-right ${
                          delta >= 0 ? 'text-cyan-400' : 'text-amber-400'
                        }`}
                      >
                        {formatCurrency(d.benefit * delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
};
