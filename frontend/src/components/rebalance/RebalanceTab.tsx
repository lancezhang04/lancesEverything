import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { portfolioApi } from '../../services/api';
import { useConfigStore } from '../../store/configStore';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { RebalanceResult } from '../../types/portfolio';

export const RebalanceTab = () => {
  const { useCache } = useConfigStore();
  const [infusion, setInfusion] = useState<string>('0');
  const [result, setResult] = useState<RebalanceResult | null>(null);

  const rebalanceMutation = useMutation({
    mutationFn: (infusionAmount: number) =>
      portfolioApi.calculateRebalance(infusionAmount, useCache),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  useEffect(() => {
    rebalanceMutation.mutate(0);
  }, []);

  const handleCalculate = () => {
    const amount = parseFloat(infusion);
    if (!isNaN(amount) && amount >= 0) {
      rebalanceMutation.mutate(amount);
    }
  };

  const handlePreset = (amount: number) => {
    setInfusion(amount.toString());
  };

  return (
    <div className="space-y-6">
      {/* Infusion Input Section */}
      <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-4">
          Calculate Rebalancing
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Infusion Amount
            </label>
            <input
              type="number"
              value={infusion}
              onChange={(e) => setInfusion(e.target.value)}
              placeholder="Enter amount..."
              className="w-full px-4 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handlePreset(500)}
              className="px-2 py-0.5 text-sm bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
            >
              $500
            </button>
            <button
              onClick={() => handlePreset(1000)}
              className="px-2 py-0.5 text-sm bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
            >
              $1,000
            </button>
            <button
              onClick={() => handlePreset(5000)}
              className="px-2 py-0.5 text-sm bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
            >
              $5,000
            </button>
          </div>

          <button
            onClick={handleCalculate}
            disabled={rebalanceMutation.isPending || !infusion}
            className="w-full px-2 py-0.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {rebalanceMutation.isPending ? 'Calculating...' : 'Calculate Rebalance'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <>
          {/* Summary Card */}
          <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-700 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-200">
                  Total Infusion
                </div>
                <div className="text-2xl font-bold text-slate-100 mt-1">
                  {formatCurrency(result.total_infusion)}
                </div>
              </div>
              <div className="border border-slate-700 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-200">
                  Whole Share Error
                </div>
                <div className="text-2xl font-bold text-slate-100 mt-1">
                  {formatCurrency(result.whole_share_error)}
                </div>
              </div>
            </div>
          </div>

          {/* Adjustments Table */}
          <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-4">
              Rebalancing Adjustments
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Current Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Adjustment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Final Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Adjustment $
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Final Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {result.adjustments.map((adj) => (
                    <tr key={adj.ticker} className="hover:bg-slate-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
                        {adj.ticker}{!adj.fractional && '*'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                        {formatNumber(adj.current_shares)}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                          adj.adjustment_shares > 0
                            ? 'text-green-600'
                            : adj.adjustment_shares < 0
                            ? 'text-red-600'
                            : 'text-slate-100'
                        }`}
                      >
                        {adj.adjustment_shares > 0 ? '+' : ''}
                        {formatNumber(adj.adjustment_shares)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                        {formatNumber(adj.final_shares)}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                          adj.adjustment_value > 0
                            ? 'text-green-600'
                            : adj.adjustment_value < 0
                            ? 'text-red-600'
                            : 'text-slate-100'
                        }`}
                      >
                        {adj.adjustment_value > 0 ? '+' : ''}
                        {formatCurrency(adj.adjustment_value)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                        {formatCurrency(adj.final_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-400">
                * No fractional shares - error redistributed to fractional positions
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
