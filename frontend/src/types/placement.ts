export type FilingStatus = 'single' | 'married_joint';
export type AccountCharacter = 'sheltered' | 'taxable';
export type Provenance = 'fetched' | 'derived' | 'stated' | 'unsourced';

/** Every assumption field carries its provenance. `unsourced` renders flagged. */
export interface SourcedFloat {
  value: number;
  source: Provenance;
  note: string;
}

export interface FundAssumption {
  ticker: string;
  gross_yield: SourcedFloat;
  qualified_pct: SourcedFloat;
  foreign_share: SourcedFloat;
  region: string;
}

export interface RegionWithholding {
  region: string;
  rate: SourcedFloat;
}

export interface AccountContribution {
  name: string;
  amount: number;
  character: AccountCharacter;
}

export interface TaxInputs {
  gross_comp: number;
  filing_status: FilingStatus;
  state_rate: number;
  pre_tax_deferral: number;
  ftc_recovery: number;
}

export interface GrowthInputs {
  years: number;
  real_return: number;
}

export interface PlacementRequest {
  tax: TaxInputs;
  growth: GrowthInputs;
  funds: FundAssumption[];
  withholding: RegionWithholding[];
  accounts: AccountContribution[];
  target_split: Record<string, number>;
}

export interface MarginalRates {
  taxable_income: number;
  standard_deduction: number;
  fed_ordinary: number;
  fed_ltcg: number;
  niit: number;
  state_rate: number;
  ordinary_rate: number;
  qualified_rate: number;
}

export interface FundDrag {
  ticker: string;
  gross_yield: number;
  qualified_pct: number;
  foreign_share: number;
  withholding_rate: number;
  /** phi = q * foreign_share * withholding */
  foreign_tax: number;
  /** kappa*qual + (1-kappa)*ord */
  blended_rate: number;
  /** q * blended */
  us_tax: number;
  drag_taxable: number;
  drag_sheltered: number;
  benefit: number;
}

export interface AllocationCell {
  account: string;
  ticker: string;
  amount: number;
}

export interface Strategy {
  name: string;
  cells: AllocationCell[];
  sheltered: Record<string, number>;
  annual_drag: number;
  drag_bps: number;
}

/** Two independent routes to the saving; they must agree. */
export interface SavingCheck {
  direct: number;
  decomposed: number;
  agree: boolean;
}

export interface GrowthPoint {
  year: number;
  vanilla_total: number;
  optimal_total: number;
  gap: number;
}

export interface PlacementResponse {
  rates: MarginalRates;
  drags: FundDrag[];
  total_contributions: number;
  sheltered_capacity: number;
  taxable_capacity: number;
  sheltered_share: number;
  fund_targets: Record<string, number>;
  vanilla: Strategy;
  optimal: Strategy;
  annual_saving: number;
  saving_bps: number;
  saving_check: SavingCheck;
  growth: GrowthPoint[];
  vanilla_terminal: number;
  optimal_terminal: number;
  terminal_gap: number;
  warnings: string[];
}

export interface ReferenceYield {
  ticker: string;
  ttm_yield: number | null;
  price: number | null;
  /** 'live' | 'cache' | 'unavailable' */
  source: string;
  as_of: string | null;
}

export interface DefaultsResponse {
  request: PlacementRequest;
  reference_yields: ReferenceYield[];
}
