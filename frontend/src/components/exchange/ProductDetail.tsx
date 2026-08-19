import { useEffect, useState } from 'react';
import { useExchangeAction } from '../../hooks/useExchange';
import { errorMessage, exchangeApi } from '../../services/exchangeApi';
import { ExchangeUser, Product } from '../../types/exchange';
import { SpreadChart } from './SpreadChart';
import { ValueStepper } from './ValueStepper';
import {
  buttonClass, Card, ErrorNote, inputClass, money, num, PhaseBadge, Pnl, SideBadge,
  tdClass, thClass,
} from './ui';

interface ProductDetailProps {
  product: Product;
  me: ExchangeUser;
  onBack: () => void;
}

export const ProductDetail = ({ product, me, onBack }: ProductDetailProps) => {
  const [bid, setBid] = useState('');
  const [ask, setAsk] = useState('');
  const [confirming, setConfirming] = useState<'BUY' | 'SELL' | null>(null);

  const join = useExchangeAction(exchangeApi.join);
  const quote = useExchangeAction(exchangeApi.quote);
  const pass = useExchangeAction(exchangeApi.pass);
  const trade = useExchangeAction(exchangeApi.trade);

  const failed = [join, quote, pass, trade].find((m) => m.isError);
  const error = failed ? errorMessage(failed.error) : null;

  // Someone else moving the market makes a previous rejection misleading
  // ("must be tighter than 5 @ 10" when it's since become 6 @ 9), so drop it.
  useEffect(() => {
    join.reset();
    quote.reset();
    pass.reset();
    trade.reset();
    setConfirming(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.bid, product.ask, product.phase, product.maker]);

  const joined = product.participants.includes(me.username);
  const isMaker = product.maker === me.username;
  const hasPassed = product.passed.includes(me.username);
  const myTrade = product.trades[me.username];

  const marketLabel =
    product.bid === null ? 'No market yet' : `${num(product.bid)} @ ${num(product.ask)}`;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-200 transition-colors self-start"
      >
        ← All products
      </button>

      {/* Market summary */}
      <Card className="p-6 border-l-4 border-emerald-500/70">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <h2 className="text-2xl font-semibold text-slate-100">{product.name}</h2>
          <PhaseBadge phase={product.phase} />
        </div>
        {product.description && (
          <p className="text-sm text-slate-400 mb-4">{product.description}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <Stat label="Market" value={marketLabel} />
          <Stat label="Market maker" value={product.maker ?? '—'} />
          <Stat
            label={product.phase === 'SETTLED' ? 'Settled at' : 'Current value'}
            value={num(product.settle_value ?? product.current_value)}
          />
          <Stat label="Per unit" value={money(product.unit_value)} />
        </div>

        {product.expiry && (
          <p className="text-xs text-slate-500 mt-4">
            Expires {product.expiry}
            {product.expired && ' — expired, awaiting settlement'}
          </p>
        )}
      </Card>

      <ErrorNote message={error} />

      {/* Phase-driven actions */}
      <Card className="p-6">
        {!joined && product.phase === 'QUOTING' && (
          <div className="flex flex-col gap-3 items-start">
            <p className="text-sm text-slate-400">
              You haven't joined this product. Only players who join can quote or trade.
            </p>
            <button
              onClick={() => join.mutate([product.id])}
              className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              Join product
            </button>
          </div>
        )}

        {!joined && product.phase !== 'QUOTING' && (
          <p className="text-sm text-slate-500">
            Quoting has closed on this product and you weren't part of it.
          </p>
        )}

        {joined && product.phase === 'QUOTING' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-slate-100">Make a market</h3>
            {hasPassed ? (
              <p className="text-sm text-slate-500">
                You passed — you're out of the quoting round. Waiting for the others to finish.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  {product.maker
                    ? `Beat ${marketLabel} — raise the bid, lower the ask, or both.`
                    : 'No market yet. Post the opening bid and ask.'}
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Bid</span>
                    <input
                      className={`${inputClass} w-28`}
                      type="number"
                      step="any"
                      value={bid}
                      onChange={(e) => setBid(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Ask</span>
                    <input
                      className={`${inputClass} w-28`}
                      type="number"
                      step="any"
                      value={ask}
                      onChange={(e) => setAsk(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={bid === '' || ask === ''}
                    onClick={() => quote.mutate([product.id, Number(bid), Number(ask)])}
                    className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                  >
                    Post market
                  </button>
                  {!isMaker && (
                    <button
                      onClick={() => pass.mutate([product.id])}
                      className={`${buttonClass} bg-slate-700 text-slate-200 hover:bg-slate-600`}
                    >
                      Pass
                    </button>
                  )}
                </div>
                {isMaker && (
                  <p className="text-xs text-slate-500">
                    You're the current market maker. You can tighten further, but you can't pass.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {joined && product.phase === 'TRADING' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-slate-100">Trade</h3>
            {isMaker ? (
              <p className="text-sm text-slate-400">
                Your market of <span className="text-slate-100">{marketLabel}</span> stands. You take
                the other side of every trade — waiting on the others.
              </p>
            ) : myTrade ? (
              <p className="text-sm text-slate-400">
                You {myTrade === 'BUY' ? 'lifted the ask' : 'hit the bid'} at{' '}
                <span className="text-slate-100">
                  {num(myTrade === 'BUY' ? product.ask : product.bid)}
                </span>
                . No take-backs.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  {product.maker} is making {marketLabel}. Pick a side — this is final.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() =>
                      confirming === 'BUY'
                        ? trade.mutate([product.id, 'BUY'])
                        : setConfirming('BUY')
                    }
                    className={`${buttonClass} ${
                      confirming === 'BUY'
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {confirming === 'BUY' ? `Confirm lift at ${num(product.ask)}` : `Lift ${num(product.ask)}`}
                  </button>
                  <button
                    onClick={() =>
                      confirming === 'SELL'
                        ? trade.mutate([product.id, 'SELL'])
                        : setConfirming('SELL')
                    }
                    className={`${buttonClass} ${
                      confirming === 'SELL'
                        ? 'bg-red-500 text-white ring-2 ring-red-300'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {confirming === 'SELL' ? `Confirm hit at ${num(product.bid)}` : `Hit ${num(product.bid)}`}
                  </button>
                  {confirming && (
                    <button
                      onClick={() => setConfirming(null)}
                      className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {confirming && (
                  <p className="text-xs text-amber-400">
                    Click again to confirm. Once placed, this can't be undone.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {joined && (product.phase === 'OPEN' || product.phase === 'SETTLED') && (
          <p className="text-sm text-slate-400">
            {product.phase === 'OPEN'
              ? 'All trades are in. P&L below marks against the running tally until settlement.'
              : `Settled at ${num(product.settle_value)}. Final P&L below.`}
          </p>
        )}
      </Card>

      {/* Keeping the tally */}
      {joined && product.phase !== 'SETTLED' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-3">Running tally</h3>
          <ValueStepper
            productId={product.id}
            isAdmin={me.is_admin}
            currentValue={product.current_value}
            proposedValue={product.proposed_value}
            proposedBy={product.proposed_by}
          />
        </Card>
      )}

      {/* Everyone's standing */}
      <Card className="overflow-hidden">
        <h3 className="text-lg font-semibold text-slate-100 px-6 pt-5 pb-3">Everyone's position</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                <th className={thClass}>Player</th>
                <th className={thClass}>Side</th>
                <th className={`${thClass} text-right`}>Price</th>
                <th className={`${thClass} text-right`}>P&amp;L</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {product.positions.map((row) => (
                <tr
                  key={row.user}
                  className={row.user === me.username ? 'bg-slate-700/40' : 'hover:bg-slate-700'}
                >
                  <td className={`${tdClass} font-medium`}>
                    {row.user}
                    {row.user === me.username && (
                      <span className="text-xs text-slate-500 ml-2">you</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <SideBadge side={row.side} />
                  </td>
                  <td className={`${tdClass} text-right`}>{num(row.price)}</td>
                  <td className={`${tdClass} text-right`}>
                    <Pnl value={row.pnl} />
                  </td>
                </tr>
              ))}
              {product.positions.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500 text-center" colSpan={4}>
                    Nobody has joined yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* How the market got here */}
      {product.quote_history.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-3">Spread progression</h3>
          <SpreadChart
            quotes={product.quote_history}
            settleValue={product.phase === 'SETTLED' ? product.settle_value : null}
          />
        </Card>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-lg text-slate-100">{value}</p>
  </div>
);
