import { useState } from 'react';
import { useExchangeAction } from '../../hooks/useExchange';
import { errorMessage, exchangeApi } from '../../services/exchangeApi';
import { ExchangeUser, Product } from '../../types/exchange';
import { buttonClass, Card, ErrorNote, inputClass, num, PhaseBadge, SectionTitle } from './ui';

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

  const createProduct = useExchangeAction(exchangeApi.createProduct);
  const setValue = useExchangeAction(exchangeApi.setValue);
  const settle = useExchangeAction(exchangeApi.settle);
  const advance = useExchangeAction(exchangeApi.advance);
  const deleteUser = useExchangeAction(exchangeApi.deleteUser);

  const failed = [createProduct, setValue, settle, advance, deleteUser].find((m) => m.isError);

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
          {products.map((product) => (
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

              {product.phase !== 'SETTLED' && (
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className={`${inputClass} w-32`}
                    type="number"
                    step="any"
                    placeholder="Value"
                    value={values[product.id] ?? ''}
                    onChange={(e) => setValues({ ...values, [product.id]: e.target.value })}
                  />
                  <button
                    disabled={values[product.id] === undefined || values[product.id] === ''}
                    onClick={() => setValue.mutate([product.id, Number(values[product.id])])}
                    className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                  >
                    Update value
                  </button>
                  <button
                    onClick={() =>
                      settle.mutate([
                        product.id,
                        values[product.id] === undefined || values[product.id] === ''
                          ? null
                          : Number(values[product.id]),
                      ])
                    }
                    className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                  >
                    Settle
                  </button>
                  {product.phase !== 'OPEN' && (
                    <button
                      onClick={() => advance.mutate([product.id])}
                      className={`${buttonClass} bg-slate-700 text-slate-200 hover:bg-slate-600`}
                    >
                      Force next phase
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Settle uses the box value, or the current running value if the box is empty.
          Force next phase unsticks a game where someone never acted.
        </p>
      </Card>

      {/* Users + export */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <SectionTitle>Users</SectionTitle>
          <button
            onClick={() => exchangeApi.downloadCsv()}
            className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
          >
            Download CSV
          </button>
        </div>
        <ul className="flex flex-col divide-y divide-slate-700">
          {users.map((user) => (
            <li key={user.username} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-100">
                {user.username}
                {user.is_admin && <span className="text-xs text-slate-500 ml-2">admin</span>}
              </span>
              {!user.is_admin && (
                <button
                  onClick={() => deleteUser.mutate([user.username])}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
