import { PositionRow, QuoteEntry } from '../types/exchange';

export interface SessionProduct {
  id: number;
  name: string;
  description?: string;
  unit_value: number;
  phase: string;
  bid: number | null;
  ask: number | null;
  maker: string | null;
  settle_value: number | null;
  quote_history: QuoteEntry[];
  positions: PositionRow[];
}

export interface Session {
  session: string;
  exported_at?: string;
  products: SessionProduct[];
}

/**
 * Sessions are bundled at build time, so committing a JSON file to
 * src/data/sessions/ is all it takes to make it appear in the picker —
 * no manifest to maintain and no API call, which matters because the
 * frontend is served statically and the API lives on another host.
 */
const files = import.meta.glob<Session>('./sessions/*.json', {
  eager: true,
  import: 'default',
});

export const sessions: Session[] = Object.values(files).sort((a, b) =>
  b.session.localeCompare(a.session)
);

export interface SessionStats {
  markets: number;
  trades: number;
  quotes: number;
  /** Winners' total take, which equals what the losers paid. */
  moneyMoved: number;
  settledInside: number;
  biggestPot: number;
  tightestSpread: number | null;
  widestOpening: number | null;
}

/** Was the final number actually inside the market someone made? */
export const settledInside = (product: SessionProduct) =>
  product.bid !== null &&
  product.ask !== null &&
  product.settle_value !== null &&
  product.settle_value >= product.bid &&
  product.settle_value <= product.ask;

export const sessionStats = (session: Session): SessionStats => {
  const filled = session.products.flatMap((p) =>
    p.positions.filter((r) => r.side === 'BUY' || r.side === 'SELL')
  );
  const spreads = session.products
    .filter((p) => p.bid !== null && p.ask !== null)
    .map((p) => (p.ask as number) - (p.bid as number));
  const openings = session.products
    .map((p) => p.quote_history[0])
    .filter(Boolean)
    .map((q) => q.ask - q.bid);

  return {
    markets: session.products.length,
    trades: filled.length,
    quotes: session.products.reduce((n, p) => n + p.quote_history.length, 0),
    moneyMoved: session.products.reduce(
      (sum, p) => sum + p.positions.reduce((s, r) => s + Math.max(r.pnl ?? 0, 0), 0),
      0
    ),
    settledInside: session.products.filter(settledInside).length,
    biggestPot: Math.max(
      0,
      ...session.products.map((p) =>
        p.positions.reduce((s, r) => s + Math.max(r.pnl ?? 0, 0), 0)
      )
    ),
    tightestSpread: spreads.length ? Math.min(...spreads) : null,
    widestOpening: openings.length ? Math.max(...openings) : null,
  };
};

export interface PlayerTotal {
  user: string;
  pnl: number;
  traded: number;
  made: number;
}

/**
 * P&L per player across a set of markets, best first. Takes the shape both a
 * live Product and an archived SessionProduct share, so the live leaderboard
 * and the session recap compute totals identically.
 */
export const playerTotals = (products: { positions: PositionRow[] }[]): PlayerTotal[] => {
  const totals = new Map<string, PlayerTotal>();
  for (const product of products) {
    for (const row of product.positions) {
      const entry = totals.get(row.user) ?? { user: row.user, pnl: 0, traded: 0, made: 0 };
      entry.pnl += row.pnl ?? 0;
      if (row.side === 'BUY' || row.side === 'SELL') entry.traded += 1;
      if (row.side === 'MAKER') entry.made += 1;
      totals.set(row.user, entry);
    }
  }
  return [...totals.values()].sort((a, b) => b.pnl - a.pnl);
};
