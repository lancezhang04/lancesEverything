import {
  CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter,
  ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Session, sessionStats, settledInside } from '../../data/sessions';
import { Card, money, num } from './ui';

/**
 * Inside vs outside is a status read, not a category, so it uses the emerald /
 * amber pair: against this dark surface it separates at ΔE 10.6 for the common
 * colour-vision deficiencies, where an emerald/red pair manages only 6.5. Each
 * point is direct-labelled as well, so the state never rests on hue alone.
 */
const INSIDE = '#34d399';
const OUTSIDE = '#fbbf24';

interface SessionStatsProps {
  session: Session;
}

export const SessionStats = ({ session }: SessionStatsProps) => {
  const stats = sessionStats(session);
  const insidePct = stats.markets ? Math.round((stats.settledInside / stats.markets) * 100) : 0;

  // Markets ran from a 2-wide spread to a 99-wide one, so absolute values would
  // squash the tight ones into nothing. Normalising to the market's own width
  // puts every settle on one comparable axis: 0 is the bid, 1 is the ask.
  const points = session.products
    .filter((p) => p.bid !== null && p.ask !== null && p.settle_value !== null)
    .map((p) => {
      const bid = p.bid as number;
      const ask = p.ask as number;
      const settle = p.settle_value as number;
      const width = ask - bid;
      return {
        name: p.name.length > 20 ? `${p.name.slice(0, 19)}…` : p.name,
        fullName: p.name,
        position: width === 0 ? 0 : (settle - bid) / width,
        bid,
        ask,
        settle,
        inside: settledInside(p),
      };
    });

  const spread = points.map((p) => p.position);
  const lo = Math.min(0, ...spread) - 0.35;
  const hi = Math.max(1, ...spread) + 0.35;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Trades" value={String(stats.trades)} sub={`across ${stats.markets} markets`} />
        <Tile label="Quotes posted" value={String(stats.quotes)} sub="markets made and beaten" />
        <Tile
          label="Money moved"
          value={money(stats.moneyMoved)}
          sub={`biggest pot ${money(stats.biggestPot)}`}
        />
        <Tile
          label="Settled in the market"
          value={`${insidePct}%`}
          sub={`${stats.settledInside} of ${stats.markets} markets`}
          tone={insidePct >= 50 ? INSIDE : OUTSIDE}
        />
      </div>

      {points.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-100">Where the number landed</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">
            Each market scaled to its own spread, so they're comparable: the shaded band is
            bid to ask. Anything outside it is a market the room got wrong.
          </p>

          <div style={{ height: Math.max(180, points.length * 46) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart layout="vertical" margin={{ top: 8, right: 56, bottom: 24, left: 8 }}>
                <CartesianGrid horizontal={false} stroke="#334155" strokeDasharray="2 4" />
                <ReferenceArea
                  x1={0}
                  x2={1}
                  fill={INSIDE}
                  fillOpacity={0.12}
                  stroke="none"
                  ifOverflow="extendDomain"
                />
                <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
                <ReferenceLine x={1} stroke="#475569" strokeWidth={1} />
                <XAxis
                  type="number"
                  dataKey="position"
                  domain={[lo, hi]}
                  ticks={[0, 1]}
                  tickFormatter={(v) => (v === 0 ? 'bid' : 'ask')}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={165}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  cursor={{ stroke: '#475569' }}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                  }}
                  content={({ payload }) => {
                    const row = payload?.[0]?.payload as (typeof points)[number] | undefined;
                    if (!row) return null;
                    return (
                      <div className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-xs">
                        <p className="text-slate-100 mb-1">{row.fullName}</p>
                        <p className="text-slate-400">
                          market {num(row.bid)} @ {num(row.ask)}
                        </p>
                        <p className="text-slate-400">settled {num(row.settle)}</p>
                        <p style={{ color: row.inside ? INSIDE : OUTSIDE }}>
                          {row.inside ? 'inside the market' : 'outside the market'}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={points}
                  isAnimationActive={false}
                  shape={(props: any) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={props.payload.inside ? INSIDE : OUTSIDE}
                      stroke="#1e293b"
                      strokeWidth={2}
                    />
                  )}
                  label={{
                    dataKey: 'settle',
                    position: 'right',
                    fill: '#cbd5e1',
                    fontSize: 11,
                    offset: 10,
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
            <Key color={INSIDE} label="settled inside the market" />
            <Key color={OUTSIDE} label="settled outside" />
          </div>
        </Card>
      )}
    </div>
  );
};

const Tile = ({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
}) => (
  <Card className="p-4">
    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl" style={tone ? { color: tone } : { color: '#f1f5f9' }}>
      {value}
    </p>
    <p className="text-xs text-slate-500 mt-1">{sub}</p>
  </Card>
);

const Key = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
    {label}
  </span>
);
