import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { FactorAnalysis } from '../../types/portfolio';

interface ReturnComparisonChartProps {
  factorAnalysis: FactorAnalysis;
}

export const ReturnComparisonChart = ({ factorAnalysis }: ReturnComparisonChartProps) => {
  const { expected_returns, loadings } = factorAnalysis;
  const { inflation, rf } = expected_returns.assumptions;

  // Benchmark: market loading = 1, all others = 0
  // So total_portfolio_premium = 1 * rm_rf
  const rmRfPremium = loadings.find((l) => l.factor === 'Rm-Rf')?.premium ?? 0;
  const benchmarkTotalPremium = rmRfPremium;

  const realEr = 0.002 / (1 + inflation);
  const benchmarkArithmetic = benchmarkTotalPremium + rf - realEr;
  const benchmarkNominalArithmetic = (1 + benchmarkArithmetic) * (1 + inflation) - 1;
  const benchmarkVol = 0.16;
  const benchmarkGeometric = benchmarkArithmetic - benchmarkVol * benchmarkVol / 2;
  const benchmarkNominalGeometric = (1 + benchmarkGeometric) * (1 + inflation) - 1;

  const HIGHLIGHT = '#f59e0b';

  const chartData = [
    {
      metric: 'Nominal Arithmetic',
      portfolio: +(expected_returns.nominal_arithmetic * 100).toFixed(2),
      benchmark: +(benchmarkNominalArithmetic * 100).toFixed(2),
      highlight: false,
    },
    {
      metric: 'Real Arithmetic',
      portfolio: +(expected_returns.real_arithmetic * 100).toFixed(2),
      benchmark: +(benchmarkArithmetic * 100).toFixed(2),
      highlight: false,
    },
    {
      metric: 'Nominal Geometric',
      portfolio: +(expected_returns.nominal_geometric * 100).toFixed(2),
      benchmark: +(benchmarkNominalGeometric * 100).toFixed(2),
      highlight: false,
    },
    {
      metric: 'Real Geometric',
      portfolio: +(expected_returns.real_geometric * 100).toFixed(2),
      benchmark: +(benchmarkGeometric * 100).toFixed(2),
      highlight: true,
    },
  ];

  const portfolioExcess = chartData.map((d) => ({
    metric: d.metric,
    excess: +(d.portfolio - d.benchmark).toFixed(2),
  }));

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100 mb-2">
        Factor Tilt Advantage
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Portfolio vs. market-only benchmark (Rm-Rf = 1, all other loadings = 0, vol = 16%)
      </p>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="metric"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            interval={0}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => `${value.toFixed(2)}%`}
          />
          <Bar dataKey="portfolio" name="Portfolio" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.highlight ? HIGHLIGHT : '#3b82f6'} />
            ))}
          </Bar>
          <Bar dataKey="benchmark" name="Market Benchmark" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.highlight ? '#b45309' : '#64748b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Excess return indicators */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {portfolioExcess.map((d) => {
          const isHighlight = d.metric === 'Real Geometric';
          return (
            <div key={d.metric} className="text-center">
              <div className={`text-[10px] ${isHighlight ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>{d.metric}</div>
              <div
                className={`text-sm font-semibold ${isHighlight ? '' : d.excess >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                style={isHighlight ? { color: HIGHLIGHT } : undefined}
              >
                {d.excess >= 0 ? '+' : ''}{d.excess}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
