import { ExpectedReturns } from '../../types/portfolio';
import { formatPercent } from '../../utils/formatters';

interface ExpectedReturnsTableProps {
  expectedReturns: ExpectedReturns;
}

export const ExpectedReturnsTable = ({
  expectedReturns,
}: ExpectedReturnsTableProps) => {
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-4">
        Estimated Expected Returns
      </h2>
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Metric
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              Nominal
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              Real
            </th>
          </tr>
        </thead>
        <tbody className="bg-slate-800 divide-y divide-slate-700">
          <tr className="hover:bg-slate-700">
            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
              Est. Arithmetic Return
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
              {formatPercent(expectedReturns.nominal_arithmetic)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
              {formatPercent(expectedReturns.real_arithmetic)}
            </td>
          </tr>
          <tr className="hover:bg-slate-700">
            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
              Est. Geometric Return
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
              {formatPercent(expectedReturns.nominal_geometric)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-right" style={{ color: '#f59e0b' }}>
              {formatPercent(expectedReturns.real_geometric)}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        *Assuming {formatPercent(expectedReturns.assumptions.inflation)} inflation,{' '}
        {formatPercent(expectedReturns.assumptions.vol)} portfolio volatility,{' '}
        {formatPercent(expectedReturns.assumptions.rf)} risk free real return
      </p>
    </div>
  );
};
