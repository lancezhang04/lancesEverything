import { FactorLoadingRow } from '../../types/portfolio';
import { formatNumber, formatPercent } from '../../utils/formatters';


interface FactorLoadingsTableProps {
  loadings: FactorLoadingRow[];
  excessPremium: number;
}

export const FactorLoadingsTable = ({
  loadings,
  excessPremium,
}: FactorLoadingsTableProps) => {
  const totalPortfolioPremium = loadings.reduce((sum, row) => sum + row.portfolio_premium, 0);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Factor
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              Loading
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              Target Loading
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              Est. Factor Premium
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              Est. Portfolio Premium
            </th>
          </tr>
        </thead>
        <tbody className="bg-slate-800 divide-y divide-slate-700">
          {loadings.map((row) => (
            <tr key={row.factor} className="hover:bg-slate-700">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
                {row.factor}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                {formatNumber(row.loading, 4)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                {formatNumber(row.target_loading, 4)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                {formatNumber(row.premium, 4)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                {formatNumber(row.portfolio_premium, 4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
        <div>
          <span className="text-xs sm:text-sm font-medium text-slate-200">
            Est. Total Portfolio Premium:{' '}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-100">
            {formatPercent(totalPortfolioPremium)}
          </span>
        </div>
        <div>
          <span className="text-xs sm:text-sm font-medium text-slate-200">
            Est. Excess Premium:{' '}
          </span>
          <span className="text-xs sm:text-sm font-bold text-emerald-400">
            {formatPercent(excessPremium)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        *Portfolio premiums are calculated using target factor loadings
      </p>
    </div>
  );
};
