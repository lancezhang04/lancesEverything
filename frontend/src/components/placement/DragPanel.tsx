import type {
  FundAssumption,
  PlacementRequest,
  PlacementResponse,
  ReferenceYield,
} from '../../types/placement';
import { formatPercent } from '../../utils/formatters';
import {
  Field,
  Formula,
  Glossary,
  NumberInput,
  Panel,
  PercentInput,
  SourceTag,
  bps,
  inputClass,
} from './fields';

interface DragPanelProps {
  request: PlacementRequest;
  result: PlacementResponse | null;
  reference: ReferenceYield[];
  onChange: (next: PlacementRequest) => void;
}

const TERMS: [string, string][] = [
  ['q', 'long-run gross dividend yield, before withholding'],
  ['κ', 'share of dividends taxed at qualified rates'],
  ['w_f', 'share of holdings domiciled outside the US'],
  ['t_wh', 'average foreign withholding rate for the region'],
  ['φ', 'foreign tax actually paid, q · w_f · t_wh'],
  ['recovery', 'share of φ recovered as a foreign tax credit'],
  ['ord', 'federal ordinary + state + NIIT'],
  ['qual', 'federal LTCG + state + NIIT'],
];

export const DragPanel = ({ request, result, reference, onChange }: DragPanelProps) => {
  const patchTax = (patch: Partial<PlacementRequest['tax']>) =>
    onChange({ ...request, tax: { ...request.tax, ...patch } });

  const patchFund = (ticker: string, patch: Partial<FundAssumption>) =>
    onChange({
      ...request,
      funds: request.funds.map((f) => (f.ticker === ticker ? { ...f, ...patch } : f)),
    });

  const patchWithholding = (region: string, value: number) =>
    onChange({
      ...request,
      withholding: request.withholding.map((w) =>
        w.region === region ? { ...w, rate: { ...w.rate, value } } : w,
      ),
    });

  const refFor = (ticker: string) => reference.find((r) => r.ticker === ticker);
  const dragFor = (ticker: string) => result?.drags.find((d) => d.ticker === ticker);
  const rates = result?.rates;

  return (
    <Panel title="Fund tax drag by account type" subtitle="bp/yr">
      {/* Inputs that drive the marginal rates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-5">
        <Field label="Gross comp" hint="$">
          <NumberInput
            value={request.tax.gross_comp}
            step={5000}
            onChange={(v) => patchTax({ gross_comp: v })}
          />
        </Field>
        <Field label="Filing status">
          <select
            className={`${inputClass} w-full`}
            value={request.tax.filing_status}
            onChange={(e) =>
              patchTax({ filing_status: e.target.value as 'single' | 'married_joint' })
            }
          >
            <option value="single">Single</option>
            <option value="married_joint">Married joint</option>
          </select>
        </Field>
        <Field label="State rate" hint="%">
          <PercentInput
            value={request.tax.state_rate}
            step={0.05}
            onChange={(v) => patchTax({ state_rate: v })}
          />
        </Field>
        <Field label="Pre-tax deferral" hint="$">
          <NumberInput
            value={request.tax.pre_tax_deferral}
            step={1000}
            onChange={(v) => patchTax({ pre_tax_deferral: v })}
          />
        </Field>
        <Field label="FTC recovery" hint="%">
          <PercentInput
            value={request.tax.ftc_recovery}
            step={5}
            decimals={0}
            onChange={(v) => patchTax({ ftc_recovery: v })}
          />
        </Field>
      </div>

      {/* Derived marginal rates */}
      {rates && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 text-xs font-mono text-slate-300 border-y border-slate-700/50 py-3">
          <span>
            <span className="text-slate-500">taxable income</span>{' '}
            ${rates.taxable_income.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
          <span>
            <span className="text-slate-500">ord</span> {formatPercent(rates.ordinary_rate)}
            <span className="text-slate-600">
              {' '}= {formatPercent(rates.fed_ordinary, 0)} + {formatPercent(rates.state_rate)} +{' '}
              {formatPercent(rates.niit, 1)}
            </span>
          </span>
          <span>
            <span className="text-slate-500">qual</span> {formatPercent(rates.qualified_rate)}
            <span className="text-slate-600">
              {' '}= {formatPercent(rates.fed_ltcg, 0)} + {formatPercent(rates.state_rate)} +{' '}
              {formatPercent(rates.niit, 1)}
            </span>
          </span>
        </div>
      )}

      {/* Regional withholding — one editable rate per region */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {request.withholding
          .filter((w) => w.region !== 'domestic')
          .map((w) => (
            <Field key={w.region} label={`t_wh ${w.region}`} hint="%">
              <div className="flex items-center gap-2">
                <PercentInput
                  value={w.rate.value}
                  step={0.5}
                  onChange={(v) => patchWithholding(w.region, v)}
                />
                <SourceTag source={w.rate.source} note={w.rate.note} />
              </div>
            </Field>
          ))}
      </div>

      {/* Assumptions + drag matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm tabular-nums">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left font-medium py-2 pr-3">Fund</th>
              <th className="text-right font-medium py-2 px-2">q</th>
              <th className="text-right font-medium py-2 px-2">TTM</th>
              <th className="text-right font-medium py-2 px-2">κ</th>
              <th className="text-right font-medium py-2 px-2">w_f</th>
              <th className="text-right font-medium py-2 px-2">φ</th>
              <th className="text-right font-medium py-2 px-2">blended</th>
              <th className="text-right font-medium py-2 px-2">q·blended</th>
              <th className="text-right font-medium py-2 px-2 text-amber-400">Taxable</th>
              <th className="text-right font-medium py-2 px-2 text-cyan-400">Sheltered</th>
              <th className="text-right font-medium py-2 pl-2 text-slate-200">Benefit</th>
            </tr>
          </thead>
          <tbody>
            {request.funds.map((fund) => {
              const d = dragFor(fund.ticker);
              const ref = refFor(fund.ticker);
              return (
                <tr key={fund.ticker} className="border-b border-slate-700/40">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-slate-100">{fund.ticker}</div>
                    <div className="text-[10px] text-slate-500">{fund.region}</div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <PercentInput
                        value={fund.gross_yield.value}
                        step={0.05}
                        width="w-16"
                        onChange={(v) =>
                          patchFund(fund.ticker, {
                            gross_yield: { ...fund.gross_yield, value: v },
                          })
                        }
                      />
                      <SourceTag
                        source={fund.gross_yield.source}
                        note={fund.gross_yield.note}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-500">
                    {ref?.ttm_yield != null ? formatPercent(ref.ttm_yield) : '—'}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <NumberInput
                        value={fund.qualified_pct.value}
                        step={0.01}
                        min={0}
                        max={1}
                        width="w-16"
                        onChange={(v) =>
                          patchFund(fund.ticker, {
                            qualified_pct: { ...fund.qualified_pct, value: v },
                          })
                        }
                      />
                      <SourceTag
                        source={fund.qualified_pct.source}
                        note={fund.qualified_pct.note}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <NumberInput
                        value={fund.foreign_share.value}
                        step={0.05}
                        min={0}
                        max={1}
                        width="w-16"
                        onChange={(v) =>
                          patchFund(fund.ticker, {
                            foreign_share: { ...fund.foreign_share, value: v },
                          })
                        }
                      />
                      <SourceTag
                        source={fund.foreign_share.source}
                        note={fund.foreign_share.note}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {d ? bps(d.foreign_tax) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {d ? formatPercent(d.blended_rate) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {d ? bps(d.us_tax) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-amber-400">
                    {d ? bps(d.drag_taxable) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-cyan-400">
                    {d ? bps(d.drag_sheltered) : '—'}
                  </td>
                  <td className="py-2 pl-2 text-right font-semibold text-slate-100">
                    {d ? bps(d.benefit) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Static derivation: reference, not commentary. */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-slate-700/50 pt-4">
        <Formula>
          {`taxable_income = gross_comp − std_deduction − pre_tax_deferral
ord            = fed_ordinary + state + NIIT
qual           = fed_LTCG     + state + NIIT

φ              = q · w_f · t_wh
blended        = κ · qual + (1 − κ) · ord

drag_taxable   = φ + q · blended − φ · recovery
drag_sheltered = φ
benefit        = q · blended − φ · recovery`}
        </Formula>
        <Glossary terms={TERMS} />
      </div>
    </Panel>
  );
};
