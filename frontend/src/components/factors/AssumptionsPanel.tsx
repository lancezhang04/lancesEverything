import { useState } from 'react';
import { useConfig, useUpdateFactorPremiums } from '../../hooks/useConfig';
import { FactorPremiums } from '../../types/config';

const DEFAULT_PREMIUMS: FactorPremiums = {
  rm_rf: 0.05,
  hml: 0.025,
  smb: 0.01,
  rmw: 0.025,
  cma: 0.015,
  rf: 0.006,
  inflation: 0.025,
  vol: 0.23,
};

export const AssumptionsPanel = () => {
  const { data: config } = useConfig();
  const updateMutation = useUpdateFactorPremiums();
  const [editedPremiums, setEditedPremiums] = useState<FactorPremiums | null>(null);

  if (!config) return null;

  const currentPremiums = editedPremiums || config.factor_premiums;

  const isDefault = (key: keyof FactorPremiums) =>
    config.factor_premiums[key] === DEFAULT_PREMIUMS[key];
  const allDefaults = Object.keys(DEFAULT_PREMIUMS).every((k) =>
    isDefault(k as keyof FactorPremiums)
  );

  const handleChange = (key: keyof FactorPremiums, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedPremiums({
        ...(editedPremiums || config.factor_premiums),
        [key]: numValue,
      });
    }
  };

  const handleSave = () => {
    if (editedPremiums) {
      updateMutation.mutate(editedPremiums);
      setEditedPremiums(null);
    }
  };

  const handleDiscard = () => {
    setEditedPremiums(null);
  };

  const handleResetToDefaults = () => {
    updateMutation.mutate(DEFAULT_PREMIUMS);
    setEditedPremiums(null);
  };

  const hasChanges = editedPremiums !== null;

  const premiumFields: Array<{ key: keyof FactorPremiums; label: string; description: string }> = [
    { key: 'rm_rf', label: 'Rm-Rf (Market Premium)', description: 'Expected market risk premium' },
    { key: 'hml', label: 'HML (Value Premium)', description: 'High minus low book-to-market premium' },
    { key: 'smb', label: 'SMB (Size Premium)', description: 'Small minus big market cap premium' },
    { key: 'rmw', label: 'RMW (Profitability Premium)', description: 'Robust minus weak profitability premium' },
    { key: 'cma', label: 'CMA (Investment Premium)', description: 'Conservative minus aggressive investment premium' },
    { key: 'rf', label: 'Rf (Risk-Free Rate)', description: 'Expected long-run risk-free real return' },
    { key: 'inflation', label: 'Inflation', description: 'Expected long-run inflation rate' },
    { key: 'vol', label: 'Volatility', description: 'Expected portfolio volatility (standard deviation)' },
  ];

  return (
    <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-3 sm:p-6 flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Parameters</h2>
        <div className="flex gap-2">
          {!allDefaults && !hasChanges && (
            <button
              onClick={handleResetToDefaults}
              disabled={updateMutation.isPending}
              className="px-2 py-0.5 text-sm bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
            >
              Reset to Defaults
            </button>
          )}
          {hasChanges && (
            <>
              <button
                onClick={handleDiscard}
                className="px-2 py-0.5 text-sm bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-2 py-0.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        {allDefaults && !hasChanges
          ? 'Using default parameters'
          : hasChanges
          ? 'Unsaved changes'
          : 'Custom parameters active'}
      </p>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {premiumFields.map(({ key, label, description }) => {
          const modified = !hasChanges && !isDefault(key);
          return (
            <div key={key} className="border-b border-slate-700 pb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-200">
                  {label}
                </label>
                {modified && (
                  <span className="text-[10px] text-slate-500">
                    default: {DEFAULT_PREMIUMS[key]}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-2">{description}</p>
              <input
                type="number"
                step="0.001"
                value={currentPremiums[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className={`w-full px-3 py-2 bg-slate-700 text-slate-100 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  modified ? 'border-blue-500' : 'border-slate-600'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
