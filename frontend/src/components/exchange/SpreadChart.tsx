import {
  Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { QuoteEntry } from '../../types/exchange';

interface SpreadChartProps {
  quotes: QuoteEntry[];
  /** Where the product actually settled, drawn as a reference band if known. */
  settleValue?: number | null;
}

/**
 * How the market tightened, round by round. Each quote is one step on the x
 * axis; the shaded band between bid and ask is the spread narrowing toward
 * whoever ended up making the market.
 */
export const SpreadChart = ({ quotes, settleValue }: SpreadChartProps) => {
  if (quotes.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No quotes were posted on this product.
      </p>
    );
  }

  const data = quotes.map((quote, index) => ({
    step: index + 1,
    user: quote.user,
    bid: quote.bid,
    ask: quote.ask,
    spread: quote.ask - quote.bid,
    // A range area (a [low, high] pair) rather than stacked areas: stacking
    // would anchor the y-axis to zero and interpolate linearly, which doesn't
    // line up with the stepped bid/ask lines.
    range: [quote.bid, quote.ask] as [number, number],
  }));

  const values = [
    ...quotes.map((q) => q.bid),
    ...quotes.map((q) => q.ask),
    ...(settleValue !== null && settleValue !== undefined ? [settleValue] : []),
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A wild opening quote (1 @ 100) makes a proportional pad enormous, which
  // wastes the axis on empty space below the data and squashes the endgame.
  const pad = Math.min(Math.max((max - min) * 0.1, 0.5), 5);
  const lower = min >= 0 ? Math.max(0, min - pad) : min - pad;

  return (
    <div className="flex flex-col gap-3">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 30, bottom: 4, left: -16 }}>
            <XAxis
              dataKey="step"
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[lower, max + pad]}
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
              }}
              labelFormatter={(step) => {
                const row = data[Number(step) - 1];
                return row ? `${row.user} — round ${row.step}` : `Round ${step}`;
              }}
              formatter={(value, name, entry) => {
                // The range area duplicates bid/ask, so show it as the spread instead.
                if (name === 'range') {
                  return [Number(entry?.payload?.spread ?? 0).toFixed(2), 'spread'];
                }
                return [Number(value).toFixed(2), String(name)];
              }}
            />
            <Area
              dataKey="range"
              type="stepAfter"
              stroke="none"
              fill="#10b981"
              fillOpacity={0.14}
              isAnimationActive={false}
            />
            <Line
              type="stepAfter"
              dataKey="ask"
              stroke="#f87171"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f87171' }}
              isAnimationActive={false}
              // bid and ask are a red/green pair the common colour-vision
              // deficiencies barely separate, so the line is named at its end.
              // Only the last point gets a label — a number on every point is
              // noise, and the quote log below already lists them all.
              label={endLabel(data.length, 'ask', '#f87171')}
            />
            <Line
              type="stepAfter"
              dataKey="bid"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 3, fill: '#34d399' }}
              isAnimationActive={false}
              label={endLabel(data.length, 'bid', '#34d399')}
            />
            {settleValue !== null && settleValue !== undefined && (
              <Line
                dataKey={() => settleValue}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <Key color="#34d399" label="bid" />
        <Key color="#f87171" label="ask" />
        {settleValue !== null && settleValue !== undefined && (
          <Key color="#94a3b8" label={`settled at ${settleValue}`} dashed />
        )}
      </div>

      <ol className="flex flex-col gap-1 text-sm">
        {quotes.map((quote, index) => (
          <li key={index} className="text-slate-400">
            <span className="text-slate-600 mr-2">{index + 1}.</span>
            <span className="text-slate-200">{quote.user}</span> quoted{' '}
            <span className="text-slate-200">
              {quote.bid} @ {quote.ask}
            </span>
            <span className="text-slate-600 ml-2">
              (spread {(quote.ask - quote.bid).toFixed(2)})
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

/** Names a line at its right-hand end, so identity never rests on hue alone. */
const endLabel = (count: number, text: string, color: string) => (props: any) =>
  props.index === count - 1 ? (
    <text
      x={props.x + 8}
      y={props.y}
      fill={color}
      fontSize={11}
      dominantBaseline="middle"
    >
      {text}
    </text>
  ) : (
    // Recharts' label type won't accept null, so skipped points render nothing.
    <g />
  );

const Key = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
  <span className="flex items-center gap-1.5">
    <span
      className="inline-block w-4 h-0"
      style={{ borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }}
    />
    {label}
  </span>
);
