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
