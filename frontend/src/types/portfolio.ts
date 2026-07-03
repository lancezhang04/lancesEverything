export enum Region {
  US = "US",
  Developed = "Developed",
  Emerging = "Emerging",
}

export enum Ticker {
  DFUS = "DFUS",
  DFAI = "DFAI",
  AVEM = "AVEM",
  AVUV = "AVUV",
  AVDV = "AVDV",
  AVES = "AVES",
}

export interface Equity {
  ticker: Ticker;
  fractional: boolean;
  share_price: number;
  market_loading: number;
  size_loading: number;
  value_loading: number;
  profitability_loading: number;
  investment_loading: number;
  region: Region;
}

export interface Position {
  ticker: Ticker;
  equity: Equity;
  value: number;
  shares: number;
  current_proportion: number;
  target_proportion: number;
  drift: number;
}

export interface Portfolio {
  total_value: number;
  active_share: number;
  positions: Position[];
  market_loading: number;
  size_loading: number;
  value_loading: number;
  profitability_loading: number;
  investment_loading: number;
  target_market_loading: number;
  target_size_loading: number;
  target_value_loading: number;
  target_profitability_loading: number;
  target_investment_loading: number;
}

export interface RegionalDistribution {
  region: Region;
  current: number;
  target: number;
}

export interface RegionalDistributionResponse {
  distributions: RegionalDistribution[];
  // True when the live market-cap source failed and targets fall back to
  // cached/default weights.
  market_data_stale: boolean;
  market_data_as_of: string | null;
}

export interface FactorLoadingRow {
  factor: string;
  loading: number;
  target_loading: number;
  premium: number;
  portfolio_premium: number;
}

export interface ExpectedReturns {
  nominal_arithmetic: number;
  real_arithmetic: number;
  nominal_geometric: number;
  real_geometric: number;
  assumptions: {
    inflation: number;
    vol: number;
    rf: number;
  };
}

export interface FactorAnalysis {
  loadings: FactorLoadingRow[];
  excess_premium: number;
  expected_returns: ExpectedReturns;
}

export interface RebalanceAdjustment {
  ticker: string;
  current_shares: number;
  current_value: number;
  target_value: number;
  adjustment_shares: number;
  adjustment_value: number;
  adjustment_error: number;
  final_shares: number;
  final_value: number;
  price: number;
  fractional: boolean;
}

export interface RebalanceResult {
  adjustments: RebalanceAdjustment[];
  total_infusion: number;
  whole_share_error: number;
}
