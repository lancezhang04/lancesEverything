import { useState } from 'react';
import { useExchangeAction } from '../../hooks/useExchange';
import { errorMessage, exchangeApi } from '../../services/exchangeApi';
import { ExchangeUser, Product } from '../../types/exchange';
import { buttonClass, Card, ErrorNote, inputClass, num, PhaseBadge, SectionTitle } from './ui';
import { ValueStepper } from './ValueStepper';

interface AdminPanelProps {
  products: Product[];
  users: ExchangeUser[];
}

export const AdminPanel = ({ products, users }: AdminPanelProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expiry, setExpiry] = useState('');
  const [unitValue, setUnitValue] = useState('0.5');
  const [values, setValues] = useState<Record<number, string>>({});
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);

  const createProduct = useExchangeAction(exchangeApi.createProduct);
  const settle = useExchangeAction(exchangeApi.settle);
  const advance = useExchangeAction(exchangeApi.advance);
  const deleteUser = useExchangeAction(exchangeApi.deleteUser);
  const clearSession = useExchangeAction(exchangeApi.clearSession);
  const deleteProduct = useExchangeAction(exchangeApi.deleteProduct);
  const removePosition = useExchangeAction(exchangeApi.removePosition);
  const setAdmin = useExchangeAction(exchangeApi.setAdmin);

  const failed = [
    createProduct, settle, advance, deleteUser, clearSession,
    deleteProduct, removePosition, setAdmin,
  ].find((m) => m.isError);

  const create = () => {
    createProduct.mutate(
      [{ name, description, expiry, unit_value: Number(unitValue) }],
      { onSuccess: () => { setName(''); setDescription(''); setExpiry(''); } }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <ErrorNote message={failed ? errorMessage(failed.error) : null} />

      {/* Create a product */}
      <Card className="p-6 border-l-4 border-emerald-500/70">
        <SectionTitle>New product</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={`${inputClass} w-full`}
            placeholder="Name — e.g. Times Tyler says 'clear as mud'"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={`${inputClass} w-full`}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Expiry</span>
            <input
              className={`${inputClass} w-full`}
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Dollars per unit</span>
            <input
              className={`${inputClass} w-full`}
              type="number"
              step="any"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
            />
          </label>
        </div>
        <button
          onClick={create}
          disabled={!name || createProduct.isPending}
          className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700 mt-4`}
        >
          Create product
        </button>
      </Card>

      {/* Run the products */}
      <Card className="p-6">
        <SectionTitle>Manage products</SectionTitle>
        {products.length === 0 && <p className="text-sm text-slate-500">No products yet.</p>}
        <div className="flex flex-col gap-4">
          {products.map((product) => {
            const settled = product.phase === 'SETTLED';
            const emptyValue = values[product.id] === undefined || values[product.id] === '';
            return (
            <div key={product.id} className="border border-slate-700 rounded-md p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-slate-100 font-medium">{product.name}</span>
                <PhaseBadge phase={product.phase} />
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Market {product.bid === null ? '—' : `${num(product.bid)} @ ${num(product.ask)}`}
                {' · '}maker {product.maker ?? '—'}
                {' · '}value {num(product.settle_value ?? product.current_value)}
              </p>

              {!settled && (
                <div className="mb-3">
                  <ValueStepper
                    productId={product.id}
                    isAdmin
                    currentValue={product.current_value}
                    proposedValue={product.proposed_value}
                    proposedBy={product.proposed_by}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center">
                <input
                  className={`${inputClass} w-32`}
                  type="number"
                  step="any"
                  placeholder={settled ? 'New settle' : 'Settle at'}
                  value={values[product.id] ?? ''}
                  onChange={(e) => setValues({ ...values, [product.id]: e.target.value })}
                />
                <button
                  // Correcting a settle needs an explicit number; re-settling at the
                  // existing value would be a confusing no-op.
                  disabled={settled && emptyValue}
                  onClick={() =>
                    settle.mutate([product.id, emptyValue ? null : Number(values[product.id])])
                  }
                  className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                >
                  {settled ? 'Correct settlement' : 'Settle'}
                </button>
                {!settled && product.phase !== 'OPEN' && (
                  <button
                    onClick={() => advance.mutate([product.id])}
                    className={`${buttonClass} bg-slate-700 text-slate-200 hover:bg-slate-600`}
                  >
                    Force next phase
                  </button>
                )}
                <button
                  onClick={() =>
                    confirmingDelete === product.id
                      ? deleteProduct.mutate([product.id], {
                          onSuccess: () => setConfirmingDelete(null),
                        })
                      : setConfirmingDelete(product.id)
                  }
                  className={`${buttonClass} ml-auto ${
                    confirmingDelete === product.id
                      ? 'bg-red-500 text-white ring-2 ring-red-300'
                      : 'bg-slate-800 text-red-400 hover:bg-slate-700'
                  }`}
                >
                  {confirmingDelete === product.id ? 'Confirm delete' : 'Delete market'}
                </button>
              </div>

              {product.positions.length > 0 && (
                <ul className="flex flex-col divide-y divide-slate-700/60 mt-3 pt-2 border-t border-slate-700">
                  {product.positions.map((row) => (
                    <li key={row.user} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-xs text-slate-400">
                        {row.user}
                        <span className="text-slate-600 ml-2">{row.side}</span>
                        {row.price !== null && <span className="text-slate-600 ml-2">at {num(row.price)}</span>}
                        {row.auto && <span className="text-amber-400 ml-2">auto</span>}
                      </span>
                      {row.user !== product.maker && (
                        <button
                          onClick={() => removePosition.mutate([product.id, row.user])}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          −/+ move the confirmed tally, which is what P&amp;L marks against; a player's
          count shows as unverified until you confirm it. Settle uses the box value,
          or the running tally if the box is empty. A settled market can still be
          corrected — enter the right value and hit Correct settlement, which
          recomputes everyone's P&amp;L. Force next phase unsticks a game where
          someone never acted — anyone who joined but never traded is dealt a
          random side at that point, flagged <span className="text-amber-400">auto</span>.
        </p>
      </Card>

      {/* Session archive */}
      <Card className="p-6">
        <SectionTitle>Session archive</SectionTitle>
        <p className="text-sm text-slate-400 mb-4">
          Downloads the whole session as JSON, including every quote posted, so it can be
          replayed in Past sessions. Commit the file to{' '}
          <code className="text-slate-300">frontend/src/data/sessions/</code> and it appears in
          the picker on the next deploy.
        </p>
        <button
          onClick={() => exchangeApi.downloadSession()}
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
        >
          Download session
        </button>
      </Card>

      {/* Users */}
      <Card className="p-6">
        <SectionTitle>Users</SectionTitle>
        <ul className="flex flex-col divide-y divide-slate-700">
          {users.map((user) => (
            <li key={user.username} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-100">
                {user.username}
                {user.is_admin && <span className="text-xs text-emerald-400 ml-2">admin</span>}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                {user.username !== 'admin' && (
                  <button
                    onClick={() => setAdmin.mutate([user.username, !user.is_admin])}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {user.is_admin ? 'Revoke admin' : 'Make admin'}
                  </button>
                )}
                {!user.is_admin && (
                  <button
                    onClick={() => deleteUser.mutate([user.username])}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Destructive, so it sits last and behind a confirm */}
      <Card className="p-6 border-l-4 border-red-500/70">
        <SectionTitle>Danger zone</SectionTitle>
        <p className="text-sm text-slate-400 mb-4">
          Clearing wipes every market and all their positions so a new game night starts
          fresh. Accounts survive. There's no undo, so download the session archive first
          if you want to keep tonight.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() =>
              confirmingClear ? clearSession.mutate([], { onSuccess: () => { setConfirmingClear(false); setValues({}); } }) : setConfirmingClear(true)
            }
            className={`${buttonClass} ${
              confirmingClear
                ? 'bg-red-500 text-white ring-2 ring-red-300'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {confirmingClear ? 'Confirm — wipe all markets' : 'Clear session'}
          </button>
          {confirmingClear && (
            <button
              onClick={() => setConfirmingClear(false)}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        {confirmingClear && (
          <p className="text-xs text-amber-400 mt-2">
            Click again to wipe {products.length} market
            {products.length === 1 ? '' : 's'}. This can't be undone.
          </p>
        )}
      </Card>
    </div>
  );
};
