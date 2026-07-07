import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { FactorAnalysis } from '../../types/portfolio';
import { formatCurrency } from '../../utils/formatters';

interface ReturnProjectionChartProps {
  factorAnalysis: FactorAnalysis;
}

const START_VALUE = 10_000;
const HORIZON = 50; // years
const TICK_YEARS = [0, 10, 20, 30, 40, 50];

const PORTFOLIO_COLOR = '#3b82f6';
const BENCHMARK_COLOR = '#94a3b8';

const formatAxis = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
};

export const ReturnProjectionChart = ({ factorAnalysis }: ReturnProjectionChartProps) => {
  const [mode, setMode] = useState<'nominal' | 'real'>('nominal');
  const { expected_returns, loadings } = factorAnalysis;
  const { inflation, rf } = expected_returns.assumptions;

  // Market-only benchmark: Rm-Rf loading = 1, all others = 0, vol = 16%.
  // Mirrors the "Factor Tilt Advantage" comparison chart on this page.
  const rmRfPremium = loadings.find((l) => l.factor === 'Rm-Rf')?.premium ?? 0;
  const realEr = 0.002 / (1 + inflation);
  const benchmarkArithmetic = rmRfPremium + rf - realEr;
  const benchmarkVol = 0.16;
  const benchmarkGeometricReal = benchmarkArithmetic - (benchmarkVol * benchmarkVol) / 2;
  const benchmarkGeometricNominal = (1 + benchmarkGeometricReal) * (1 + inflation) - 1;

  const portfolioRate = mode === 'nominal'
    ? expected_returns.nominal_geometric
    : expected_returns.real_geometric;
  const benchmarkRate = mode === 'nominal'
    ? benchmarkGeometricNominal
    : benchmarkGeometricReal;

  const data = Array.from({ length: HORIZON + 1 }, (_, year) => ({
    year,
    portfolio: START_VALUE * Math.pow(1 + portfolioRate, year),
    benchmark: START_VALUE * Math.pow(1 + benchmarkRate, year),
  }));

  const ModeButton = ({ value, label }: { value: 'nominal' | 'real'; label: string }) => (
    <button
      onClick={() => setMode(value)}
      className={`px-2.5 py-1 text-xs transition-colors ${
        mode === value
          ? 'bg-blue-600 text-white'
          : 'bg-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-xl font-semibold text-slate-100">Long-Run Growth Projection</h2>
        <div className="flex rounded-md border border-slate-600 overflow-hidden">
          <ModeButton value="nominal" label="Nominal" />
          <ModeButton value="real" label="Real" />
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Growth of {formatCurrency(START_VALUE)} at the projected {mode === 'nominal' ? 'nominal' : 'real (inflation-adjusted)'}{' '}
        geometric return, compounded annually. Benchmark = market-only (Rm-Rf = 1, all other loadings = 0, vol = 16%).
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, HORIZON]}
            ticks={TICK_YEARS}
            tickFormatter={(y) => `${y}y`}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={formatAxis}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={52}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(y) => `Year ${y}`}
          />
          <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="portfolio"
            name="Factor Portfolio"
            stroke={PORTFOLIO_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            name="Market Benchmark"
            stroke={BENCHMARK_COLOR}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Ending-value callouts at each decade */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {[10, 20, 30, 40, 50].map((yr) => (
          <div key={yr} className="text-center">
            <div className="text-[10px] text-slate-400">{yr}y</div>
            <div className="text-xs font-semibold" style={{ color: PORTFOLIO_COLOR }}>
              {formatAxis(START_VALUE * Math.pow(1 + portfolioRate, yr))}
            </div>
            <div className="text-[10px] text-slate-500">
              {formatAxis(START_VALUE * Math.pow(1 + benchmarkRate, yr))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
