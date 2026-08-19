import { useState } from 'react';
import { Session, SessionProduct, sessions } from '../../data/sessions';
import { Leaderboard } from './Leaderboard';
import { SpreadChart } from './SpreadChart';
import { Card, money, num, Pnl, SectionTitle, SideBadge, tdClass, thClass } from './ui';

/** Read-only recap of past sessions, replayed from committed JSON archives. */
export const SessionsTab = () => {
  const [sessionName, setSessionName] = useState(sessions[0]?.session ?? '');
  const [productId, setProductId] = useState<number | null>(null);

  const session = sessions.find((s) => s.session === sessionName);

  if (!session) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-500">
          No sessions archived yet. Download a session from the admin tab and commit it to{' '}
          <code className="text-slate-400">frontend/src/data/sessions/</code>.
        </p>
      </Card>
    );
  }

  const product = session.products.find((p) => p.id === productId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-slate-500 uppercase tracking-wider">Session</label>
        <select
          value={sessionName}
          onChange={(e) => {
            setSessionName(e.target.value);
            setProductId(null);
          }}
          className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100
                     focus:outline-none focus:border-emerald-500"
        >
          {sessions.map((s) => (
            <option key={s.session} value={s.session}>
              {s.session}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          {session.products.length} market{session.products.length === 1 ? '' : 's'}
        </span>
      </div>

      {product ? (
        <ProductRecap product={product} onBack={() => setProductId(null)} />
      ) : (
        <SessionOverview session={session} onOpen={setProductId} />
      )}
    </div>
  );
};

const SessionOverview = ({
  session,
  onOpen,
}: {
  session: Session;
  onOpen: (id: number) => void;
}) => {
  return (
    <>
      <section>
        <SectionTitle>Session P&amp;L</SectionTitle>
        <Leaderboard products={session.products} />
      </section>

      <section>
        <SectionTitle>Markets</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {session.products.map((product) => (
            <button
              key={product.id}
              onClick={() => onOpen(product.id)}
              className="text-left bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-5
                         border-l-4 border-emerald-500/70 transition-shadow duration-500
                         hover:shadow-[0_0_32px_rgba(16,185,129,0.35)]"
            >
              <p className="text-slate-100 font-semibold mb-2">{product.name}</p>
              <p className="text-xs text-slate-500">
                {num(product.bid)} @ {num(product.ask)} · maker {product.maker ?? '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                settled {num(product.settle_value)} · {money(product.unit_value)} per unit
                {product.quote_history.length > 0 &&
                  ` · ${product.quote_history.length} quote${
                    product.quote_history.length === 1 ? '' : 's'
                  }`}
              </p>
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

const ProductRecap = ({
  product,
  onBack,
}: {
  product: SessionProduct;
  onBack: () => void;
}) => (
  <div className="flex flex-col gap-6">
    <button
      onClick={onBack}
      className="text-sm text-slate-400 hover:text-slate-200 transition-colors self-start"
    >
      ← All markets
    </button>

    <Card className="p-6 border-l-4 border-emerald-500/70">
      <h2 className="text-2xl font-semibold text-slate-100 mb-4">{product.name}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Final market" value={`${num(product.bid)} @ ${num(product.ask)}`} />
        <Stat label="Market maker" value={product.maker ?? '—'} />
        <Stat label="Settled at" value={num(product.settle_value)} />
        <Stat label="Per unit" value={money(product.unit_value)} />
      </div>
    </Card>

    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-3">Spread progression</h3>
      <SpreadChart quotes={product.quote_history} settleValue={product.settle_value} />
    </Card>

    <Card className="overflow-hidden">
      <h3 className="text-lg font-semibold text-slate-100 px-6 pt-5 pb-3">Everyone's bet</h3>
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
              <tr key={row.user} className="hover:bg-slate-700">
                <td className={`${tdClass} font-medium`}>{row.user}</td>
                <td className={tdClass}>
                  <SideBadge side={row.side} />
                </td>
                <td className={`${tdClass} text-right`}>{num(row.price)}</td>
                <td className={`${tdClass} text-right`}>
                  <Pnl value={row.pnl} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-lg text-slate-100">{value}</p>
  </div>
);
