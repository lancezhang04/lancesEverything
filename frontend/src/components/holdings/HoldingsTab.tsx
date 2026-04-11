import { useState, useEffect, useRef } from 'react';
import { usePortfolio, useRegionalDistribution } from '../../hooks/usePortfolio';
import {
  usePortfolioTemplates,
  useUpdatePortfolio,
  useResetPortfolio,
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

  const hasUnsavedChanges = editedHoldings !== null || editedVol !== null;

  const handleTemplateChange = (templateKey: string) => {
    if (templateKey === 'custom') {
      // Switch to empty custom portfolio — immediately push to backend
      setSelectedTemplate('custom');
      setEditedHoldings([]);
      setEditedSharesRaw({});
      setEditedVol(0.20);
      updatePortfolioMutation.mutate({ holdings: [], vol: 0.20 });
    } else if (templateState?.templates[templateKey]) {
      setSelectedTemplate(templateKey);
      // Reset to template — clear overrides and tell backend
      resetPortfolioMutation.mutate(undefined);
      setEditedHoldings(null);
      setEditedSharesRaw({});
      setEditedVol(null);
    }
  };

  const handleSharesChange = (ticker: string, newShares: string) => {
    // Always update raw display value so user can clear the field
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

  const handleRemoveTicker = (ticker: string) => {
    const base = editedHoldings ?? workingHoldings;
    const updated = base.filter((h) => h.ticker !== ticker);
    setEditedHoldings(updated);
    setSelectedTemplate('custom');
  };

  const handleAddTicker = () => {
    setAddingTicker(true);
    setTimeout(() => newTickerRef.current?.focus(), 0);
  };

  const handleConfirmAddTicker = () => {
    const shares = parseFloat(newSharesValue);
    if (!newTickerValue || isNaN(shares) || shares <= 0) {
      // Invalid — cancel
      setAddingTicker(false);
      setNewTickerValue('');
      setNewSharesValue('');
      return;
    }

    const base = editedHoldings ?? [...workingHoldings];
    setEditedHoldings([...base, { ticker: newTickerValue, shares }]);
    setSelectedTemplate('custom');
    setAddingTicker(false);
    setNewTickerValue('');
    setNewSharesValue('');
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

  const handleSave = () => {
    const holdings = editedHoldings ?? workingHoldings;
    const vol = editedVol ?? currentVol;
    updatePortfolioMutation.mutate({ holdings, vol });
    setEditedHoldings(null);
    setEditedSharesRaw({});
    setEditedVol(null);
    setSelectedTemplate('custom');
  };

  const handleDiscard = () => {
    setEditedHoldings(null);
    setEditedSharesRaw({});
    setEditedVol(null);
    if (templateState) {
      setSelectedTemplate(templateState.has_override ? 'custom' : (templateState.active_template ?? 'lances'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-100">
              Current Holdings
            </h2>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="px-2 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="font-medium">Est. Vol:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={currentVol}
                onChange={(e) => handleVolChange(e.target.value)}
                className="w-16 px-1.5 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
              />
            </div>
            {hasUnsavedChanges && (
              <>
                <button
                  onClick={handleDiscard}
                  className="px-2 py-0.5 text-sm bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={updatePortfolioMutation.isPending}
                  className="px-2 py-0.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {updatePortfolioMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Editable holdings table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
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
              {workingHoldings.map((holding) => {
                const position = portfolio.positions.find((p) => p.ticker === holding.ticker);
                const sharesRawValue = editedSharesRaw[holding.ticker];
                const sharesDisplayValue = sharesRawValue !== undefined
                  ? sharesRawValue
                  : holding.shares.toString();
                return (
                  <tr key={holding.ticker} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
                      {holding.ticker}
                      {position && !position.equity.fractional && '*'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {position ? formatCurrency(position.equity.share_price) : '--'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sharesDisplayValue}
                        onChange={(e) => handleSharesChange(holding.ticker, e.target.value)}
                        className="w-24 px-1.5 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {position ? formatCurrency(position.value) : '--'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {position ? formatPercent(position.current_proportion) : '--'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-100 text-right">
                      {position ? formatPercent(position.target_proportion) : '--'}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        position
                          ? position.drift > 0
                            ? 'text-green-600'
                            : position.drift < 0
                            ? 'text-red-600'
                            : 'text-slate-100'
                          : 'text-slate-400'
                      }`}
                    >
                      {position ? formatPercent(position.drift) : '--'}
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
                  <td className="px-4 py-3">
                    <select
                      ref={newTickerRef}
                      value={newTickerValue}
                      onChange={(e) => setNewTickerValue(e.target.value)}
                      className="w-24 px-1.5 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {availableTickers.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 text-right">
                    --
                  </td>
                  <td className="px-4 py-3 text-right">
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
                      className="w-24 px-1.5 py-0.5 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                    />
                  </td>
                  <td colSpan={4} className="px-4 py-3 text-sm">
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

      <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-6">
        <PortfolioOverview distributions={regionalDistribution} portfolio={portfolio} />
      </div>
    </div>
  );
};
