export type Phase = 'QUOTING' | 'TRADING' | 'OPEN' | 'SETTLED';

/** BUY / SELL for a filled trade, MAKER for the market maker, PENDING for someone yet to act. */
export type Side = 'BUY' | 'SELL' | 'MAKER' | 'PENDING';

export interface PositionRow {
  user: string;
  side: Side;
  price: number | null;
  pnl: number | null;
}

export interface QuoteEntry {
  user: string;
  bid: number;
  ask: number;
  at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  expiry: string;
  unit_value: number;
  phase: Phase;
  bid: number | null;
  ask: number | null;
  maker: string | null;
  participants: string[];
  passed: string[];
  trades: Record<string, 'BUY' | 'SELL'>;
  quote_history: QuoteEntry[];
  current_value: number | null;
  /** Players' running count, unverified until an admin confirms it. */
  proposed_value: number | null;
  proposed_by: string | null;
  settle_value: number | null;
  expired: boolean;
  positions: PositionRow[];
}

export interface MyPosition {
  product_id: number;
  product: string;
  unit_value: number;
  phase: Phase;
  bid: number | null;
  ask: number | null;
  mark: number | null;
  side: Side;
  price: number | null;
  pnl: number | null;
}

export interface ExchangeUser {
  username: string;
  is_admin: boolean;
}

export interface ExchangeState {
  me: ExchangeUser;
  products: Product[];
  positions: MyPosition[];
  users: ExchangeUser[];
}

export interface LoginResponse {
  token: string;
  username: string;
  is_admin: boolean;
}
