import { useState, useEffect, useRef, useCallback } from 'react';
import { usePortfolio, useRegionalDistribution } from '../../hooks/usePortfolio';
import {
  usePortfolioTemplates,
  useUpdatePortfolio,
  useResetPortfolio,
  useEquityPrices,
} from '../../hooks/useConfig';
import { PortfolioHoldingItem } from '../../types/config';
import { Ticker } from '../../types/portfolio';
import { PortfolioOverview } from './RegionalChart';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const ALL_TICKERS = Object.values(Ticker);

export const HoldingsTab = () => {
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { data: regionalDistribution, isLoading: regionalLoading } =
    useRegionalDistribution();
  const { data: templateState } = usePortfolioTemplates();
  const updatePortfolioMutation = useUpdatePortfolio();
  const resetPortfolioMutation = useResetPortfolio();
  const { data: equityPrices } = useEquityPrices();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('lances');
  const [editedHoldings, setEditedHoldings] = useState<PortfolioHoldingItem[] | null>(null);
  const [editedSharesRaw, setEditedSharesRaw] = useState<Record<string, string>>({});
  const [editedVol, setEditedVol] = useState<number | null>(null);
  const [addingTicker, setAddingTicker] = useState(false);
  const [newTickerValue, setNewTickerValue] = useState('');
  const [newSharesValue, setNewSharesValue] = useState('');
  const newTickerRef = useRef<HTMLSelectElement>(null);

  // Sync template selection from server state
  useEffect(() => {
    if (templateState) {
      if (templateState.has_override) {
        setSelectedTemplate('custom');
      } else if (templateState.active_template) {
        setSelectedTemplate(templateState.active_template);
      }
    }
  }, [templateState]);

  // Helper to push current holdings to backend
  const pushToBackend = useCallback((holdings: PortfolioHoldingItem[], vol?: number) => {
    updatePortfolioMutation.mutate({ holdings, vol: vol ?? editedVol ?? templateState?.vol ?? 0.23 });
  }, [updatePortfolioMutation, editedVol, templateState?.vol]);

  if (portfolioLoading || regionalLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!portfolio || !regionalDistribution) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">Failed to load portfolio data</div>
      </div>
    );
  }

  const currentVol = editedVol ?? templateState?.vol ?? 0.23;

  // Get the working holdings: either edited, or derived from current portfolio
  const workingHoldings: PortfolioHoldingItem[] = editedHoldings ??
    portfolio.positions.map((p) => ({ ticker: p.ticker, shares: p.shares }));

  // Tickers already in the portfolio
  const usedTickers = new Set(workingHoldings.map((h) => h.ticker));
  const availableTickers = ALL_TICKERS.filter((t) => !usedTickers.has(t));

  // Build price lookup: position prices take priority, then equityPrices
  const getPrice = (ticker: string): number => {
    const pos = portfolio.positions.find((p) => p.ticker === ticker);
    return pos?.equity.share_price ?? equityPrices?.[ticker] ?? 0;
  };

  // Compute values locally for instant display
  const computedRows = workingHoldings.map((holding) => {
    const price = getPrice(holding.ticker);
    const value = price * holding.shares;
    const position = portfolio.positions.find((p) => p.ticker === holding.ticker);
    return { holding, price, value, position };
  });

  const totalValue = computedRows.reduce((sum, r) => sum + r.value, 0);

  const handleTemplateChange = (templateKey: string) => {
    if (templateKey === 'custom') {
      setSelectedTemplate('custom');
      setEditedHoldings(null);
      setEditedSharesRaw({});
      setEditedVol(0.20);
      updatePortfolioMutation.mutate({ holdings: [], vol: 0.20 });
    } else if (templateState?.templates[templateKey]) {
      setSelectedTemplate(templateKey);
      resetPortfolioMutation.mutate(undefined);
      setEditedHoldings(null);
      setEditedSharesRaw({});
      setEditedVol(null);
    }
  };

  const handleSharesChange = (ticker: string, newShares: string) => {
    setEditedSharesRaw((prev) => ({ ...prev, [ticker]: newShares }));

    const shares = parseFloat(newShares);
    if (isNaN(shares) || shares < 0) return;

    const base = editedHoldings ?? workingHoldings;
    const updated = base.map((h) =>
      h.ticker === ticker ? { ...h, shares } : h
    );
    setEditedHoldings(updated);
    setSelectedTemplate('custom');
  };

  // Auto-save when user finishes editing a shares field
  const handleSharesBlur = () => {
    const holdings = editedHoldings ?? workingHoldings;
    pushToBackend(holdings);
    setEditedHoldings(null);
    setEditedSharesRaw({});
  };

  const handleRemoveTicker = (ticker: string) => {
    const base = editedHoldings ?? workingHoldings;
    const updated = base.filter((h) => h.ticker !== ticker);
    setSelectedTemplate('custom');
    pushToBackend(updated);
    setEditedHoldings(null);
    setEditedSharesRaw({});
  };

  const handleAddTicker = () => {
    setAddingTicker(true);
    setTimeout(() => newTickerRef.current?.focus(), 0);
  };

  const handleConfirmAddTicker = () => {
    const shares = parseFloat(newSharesValue);
    if (!newTickerValue || isNaN(shares) || shares <= 0) {
      setAddingTicker(false);
      setNewTickerValue('');
      setNewSharesValue('');
      return;
    }

    const base = editedHoldings ?? [...workingHoldings];
    const updated = [...base, { ticker: newTickerValue, shares }];
    setSelectedTemplate('custom');
    setAddingTicker(false);
    setNewTickerValue('');
    setNewSharesValue('');
    pushToBackend(updated);
    setEditedHoldings(null);
  };

  const handleCancelAdd = () => {
    setAddingTicker(false);
    setNewTickerValue('');
    setNewSharesValue('');
  };

  const handleVolChange = (value: string) => {
    const vol = parseFloat(value);
    if (!isNaN(vol) && vol >= 0 && vol <= 1) {
      setEditedVol(vol);
      setSelectedTemplate('custom');
    }
  };

  // Auto-save vol on blur
  const handleVolBlur = () => {
    if (editedVol !== null) {
      const holdings = editedHoldings ?? workingHoldings;
      pushToBackend(holdings, editedVol);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
              Current Holdings
            </h2>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="px-2 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-fit"
            >
              {templateState &&
                Object.entries(templateState.templates).map(([key, tmpl]) => (
                  <option key={key} value={key}>
                    {tmpl.name}
                  </option>
                ))}
              {selectedTemplate === 'custom' && !templateState?.templates.custom && (
                <option value="custom">Custom</option>
              )}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="font-medium">Est. Vol:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={currentVol}
              onChange={(e) => handleVolChange(e.target.value)}
              onBlur={handleVolBlur}
              className="w-16 px-1.5 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
            />
          </div>
        </div>

        {/* Holdings table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-28">
                  Ticker
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Shares
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Current %
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Target %
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Drift
                </th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="bg-slate-800/50 divide-y divide-slate-700">
              {computedRows.map(({ holding, price, value, position }) => {
                const sharesRawValue = editedSharesRaw[holding.ticker];
                const sharesDisplayValue = sharesRawValue !== undefined
                  ? sharesRawValue
                  : parseFloat(holding.shares.toPrecision(10)).toString();
                const currentPct = totalValue > 0 ? value / totalValue : 0;
                const targetPct = position?.target_proportion ?? 0;
                const drift = currentPct - targetPct;
                return (
                  <tr key={holding.ticker} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
                      {holding.ticker}
                      {position && !position.equity.fractional && '*'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {formatCurrency(price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sharesDisplayValue}
                        onChange={(e) => handleSharesChange(holding.ticker, e.target.value)}
                        onBlur={handleSharesBlur}
                        className="w-24 px-1.5 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {formatCurrency(value)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {formatPercent(currentPct)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {formatPercent(targetPct)}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        drift > 0.0001
                          ? 'text-green-600'
                          : drift < -0.0001
                          ? 'text-red-600'
                          : 'text-slate-100'
                      }`}
                    >
                      {formatPercent(drift)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleRemoveTicker(holding.ticker)}
                        className="text-slate-500 hover:text-red-400 text-sm"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Add ticker row */}
              {addingTicker && (
                <tr className="bg-slate-700/30">
                  <td className="px-4 py-1.5">
                    <select
                      ref={newTickerRef}
                      value={newTickerValue}
                      onChange={(e) => setNewTickerValue(e.target.value)}
                      className="w-full px-1.5 py-0.5 text-xs bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {availableTickers.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-1.5 text-xs text-slate-100 text-right">
                    {newTickerValue && equityPrices?.[newTickerValue]
                      ? formatCurrency(equityPrices[newTickerValue])
                      : '--'}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newSharesValue}
                      onChange={(e) => setNewSharesValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmAddTicker();
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                      className="w-24 px-1.5 py-0.5 text-xs bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                    />
                  </td>
                  <td colSpan={4} className="px-4 py-1.5">
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmAddTicker}
                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={handleCancelAdd}
                        className="px-2 py-0.5 text-xs bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-2 flex justify-between items-center">
            <p className="text-xs text-slate-400">* No fractional shares</p>
            {!addingTicker && availableTickers.length > 0 && (
              <button
                onClick={handleAddTicker}
                className="px-2 py-0.5 text-sm text-blue-400 hover:text-blue-300"
              >
                + Add Ticker
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6">
        <PortfolioOverview distributions={regionalDistribution} portfolio={portfolio} />
      </div>
    </div>
  );
};
