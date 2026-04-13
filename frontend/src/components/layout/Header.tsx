import { useQueryClient } from '@tanstack/react-query';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useConfigStore } from '../../store/configStore';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const DATA_QUERY_KEYS = ['portfolio', 'regionalDistribution', 'factorAnalysis', 'targetProportions'];

export const Header = () => {
  const { useCache, setUseCache } = useConfigStore();
  const queryClient = useQueryClient();
  const { data: portfolio, isRefetching } = usePortfolio();

  const handleRefresh = () => {
    DATA_QUERY_KEYS.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })
    );
  };

  const handleToggleCache = (checked: boolean) => {
    setUseCache(checked);
    // Only refetch when switching to live data — cached results don't change
    if (!checked) {
      DATA_QUERY_KEYS.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    }
  };

  return (
    <div className="bg-slate-800 shadow-lg shadow-slate-900/50">
      <div className="px-4 py-3 sm:px-10 sm:py-4 lg:px-16">
        <h1 className="text-slate-100">
          <div className="flex items-end gap-2">
            <a href="/"><img src="/lances-logo.svg" alt="Lance's" className="inline-block h-12 sm:h-[3.2rem]" /></a>
            <span className="hidden sm:inline text-3xl">Factor Portfolio Analyzer</span>
          </div>
          <span className="block sm:hidden text-lg mt-1">Factor Portfolio Analyzer</span>
        </h1>
        <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-slate-300">
            {portfolio && (
              <>
                <div>
                  <span className="font-medium">Portfolio Value:</span>{' '}
                  <span className="text-slate-100">{formatCurrency(portfolio.total_value)}</span>
                </div>
                <div>
                  <span className="font-medium">Active Share:</span>{' '}
                  <span className="text-slate-100">{formatPercent(portfolio.active_share)}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <label className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200">
              <input
                type="checkbox"
                checked={useCache}
                onChange={(e) => handleToggleCache(e.target.checked)}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-600 rounded"
              />
              Use Cached Data
            </label>
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="px-2 py-0.5 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isRefetching ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
