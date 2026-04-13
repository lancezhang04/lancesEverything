import { useFactorAnalysis } from '../../hooks/usePortfolio';
import { FactorLoadingsTable } from './FactorLoadingsTable';
import { ExpectedReturnsTable } from './ExpectedReturnsTable';
import { AssumptionsPanel } from './AssumptionsPanel';
import { ReturnComparisonChart } from './ReturnComparisonChart';

export const FactorsTab = () => {
  const { data: factorAnalysis, isLoading } = useFactorAnalysis();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!factorAnalysis) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">Failed to load factor analysis</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
      <div className="lg:col-span-2 min-h-0">
        <AssumptionsPanel />
      </div>

      <div className="lg:col-span-3 space-y-4 sm:space-y-6">
        <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-4">
            Estimated Portfolio Factor Premiums
          </h2>
          <FactorLoadingsTable
            loadings={factorAnalysis.loadings}
            excessPremium={factorAnalysis.excess_premium}
          />
        </div>

        <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
          <ExpectedReturnsTable expectedReturns={factorAnalysis.expected_returns} />
        </div>

        <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
          <ReturnComparisonChart factorAnalysis={factorAnalysis} />
        </div>
      </div>
    </div>
  );
};