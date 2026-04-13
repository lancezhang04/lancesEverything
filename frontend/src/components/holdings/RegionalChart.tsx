import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { RegionalDistribution, Portfolio } from '../../types/portfolio';
import { formatPercent } from '../../utils/formatters';

interface PortfolioOverviewProps {
  distributions: RegionalDistribution[];
  portfolio: Portfolio;
}

const REGION_COLORS: Record<string, string> = {
  US: '#3b82f6',
  Developed: '#f59e0b',
  Emerging: '#93c5fd',
};

export const PortfolioOverview = ({ distributions, portfolio }: PortfolioOverviewProps) => {
  const chartData = distributions.map((dist) => ({
    name: dist.region,
    current: dist.current * 100,
    target: dist.target * 100,
  }));

  const factorData = [
    { factor: 'Rm-Rf', current: portfolio.market_loading, target: portfolio.target_market_loading },
    { factor: 'SMB', current: portfolio.size_loading, target: portfolio.target_size_loading },
    { factor: 'HML', current: portfolio.value_loading, target: portfolio.target_value_loading },
    { factor: 'RMW', current: portfolio.profitability_loading, target: portfolio.target_profitability_loading },
    { factor: 'CMA', current: portfolio.investment_loading, target: portfolio.target_investment_loading },
  ];

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-4 sm:mb-6">Portfolio Overview</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left: Pie chart + legend */}
        <div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="w-[200px] h-[200px] sm:w-[280px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius="80%"
                    fill="#8884d8"
                    dataKey="current"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex sm:flex-col gap-4 sm:gap-3">
              {distributions.map((dist) => (
                <div key={dist.region} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: REGION_COLORS[dist.region] }}
                    />
                    <span className="text-slate-200 font-medium text-sm">{dist.region}</span>
                  </div>
                  <div className="text-xs text-slate-100 ml-5">
                    <div>Current: <span className="font-semibold">{formatPercent(dist.current)}</span></div>
                    <div className="text-slate-400">Target: {formatPercent(dist.target)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Factor loadings bar chart */}
        <div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={factorData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="factor" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} ticks={[-0.5, 0, 0.5, 1.0, 1.5]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => value.toFixed(3)}
                cursor={{ fill: 'rgba(147, 197, 253, 0.1)' }}
              />
              <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
              <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 12 }} />
              <Bar dataKey="current" name="Current" fill="#3b82f6" activeBar={false} />
              <Bar dataKey="target" name="Target" fill="#f59e0b" activeBar={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
