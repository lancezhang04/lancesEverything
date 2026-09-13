import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlacementRequest, PlacementResponse } from '../../types/placement';
import { formatCurrency } from '../../utils/formatters';
import { Field, Formula, NumberInput, Panel, PercentInput } from './fields';

interface GrowthPanelProps {
  request: PlacementRequest;
  result: PlacementResponse | null;
  onChange: (next: PlacementRequest) => void;
}

const compact = (v: number) =>
  `$${v.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}`;

export const GrowthPanel = ({ request, result, onChange }: GrowthPanelProps) => {
  const patchGrowth = (patch: Partial<PlacementRequest['growth']>) =>
    onChange({ ...request, growth: { ...request.growth, ...patch } });

  const data = (result?.growth ?? []).map((g) => ({
    year: g.year,
    gap: g.gap,
    vanilla: g.vanilla_total,
    optimal: g.optimal_total,
  }));

  return (
    <Panel title="Projected growth" subtitle="real, contributions added annually">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Field label="Years">
          <NumberInput
            value={request.growth.years}
            step={1}
            min={0}
            max={80}
            onChange={(v) => patchGrowth({ years: Math.max(0, Math.round(v)) })}
          />
        </Field>
        <Field label="Real return" hint="%">
          <PercentInput
            value={request.growth.real_return}
            step={0.25}
            onChange={(v) => patchGrowth({ real_return: v })}
          />
        </Field>
      </div>

      {result && (
        <>
          <div className="flex flex-wrap gap-x-8 gap-y-3 border-y border-slate-700/50 py-3 mb-5">
            <div>
              <div className="text-xs text-slate-500">Vanilla terminal</div>
              <div className="text-lg font-semibold text-amber-400 tabular-nums">
                {compact(result.vanilla_terminal)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Optimal terminal</div>
              <div className="text-lg font-semibold text-cyan-400 tabular-nums">
                {compact(result.optimal_terminal)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Difference</div>
              <div className="text-lg font-semibold text-slate-100 tabular-nums">
                {formatCurrency(result.terminal_gap)}
              </div>
            </div>
          </div>

          {data.length > 1 ? (
            <>
              <div className="text-xs text-slate-500 mb-2 font-mono">
                optimal − vanilla, real dollars
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(v: number) => compact(v)}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#e2e8f0',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelFormatter={(v: number) => `Year ${v}`}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                  <Area
                    type="monotone"
                    dataKey="gap"
                    name="Gap"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fill="url(#gapFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="text-sm text-slate-500 py-8 text-center font-mono">
              years = 0
            </div>
          )}

          <div className="mt-5 border-t border-slate-700/50 pt-4">
            <Formula>
              {`bucket_drag_sheltered = Σ wᵢ · drag_sheltered_i
bucket_drag_taxable   = Σ wᵢ · drag_taxable_i

balanceₜ = (balanceₜ₋₁ + contribution) · (1 + r − bucket_drag)

placement re-solved each year on cumulative balances:
the two buckets compound at different rates, so the
sheltered share drifts away from its contribution value.`}
            </Formula>
          </div>
        </>
      )}
    </Panel>
  );
};
