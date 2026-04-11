import axios from 'axios';
import {
  Portfolio,
  RegionalDistribution,
  FactorAnalysis,
  RebalanceResult,
} from '../types/portfolio';
import { Config, TargetProportions, FactorPremiums, EquityConfig, PortfolioTemplatesState, PortfolioHoldingItem } from '../types/config';
import { Region } from '../types/portfolio';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const portfolioApi = {
  getPortfolio: async (useCache = false): Promise<Portfolio> => {
    const { data } = await api.get('/portfolio', { params: { use_cache: useCache } });
    return data;
  },

  getRegionalDistribution: async (useCache = false): Promise<RegionalDistribution[]> => {
    const { data } = await api.get('/portfolio/regional-distribution', {
      params: { use_cache: useCache },
    });
    return data.distributions;
  },

  getFactorAnalysis: async (useCache = false): Promise<FactorAnalysis> => {
    const { data } = await api.get('/portfolio/factor-analysis', {
      params: { use_cache: useCache },
    });
    return data;
  },

  calculateRebalance: async (
    infusion: number,
    useCache = false
  ): Promise<RebalanceResult> => {
    const { data } = await api.post(
      '/portfolio/rebalance',
      { infusion },
      { params: { use_cache: useCache } }
    );
    return data;
  },
};

export const configApi = {
  getConfig: async (): Promise<Config> => {
    const { data } = await api.get('/config');
    return data;
  },

  updateFactorPremiums: async (factorPremiums: FactorPremiums): Promise<void> => {
    await api.put('/config/factor-premiums', { factor_premiums: factorPremiums });
  },

  updateEquityConfig: async (ticker: string, equityConfig: EquityConfig): Promise<void> => {
    await api.put(`/config/equity/${ticker}`, { equity_config: equityConfig });
  },

  updateTargetValueLoadings: async (
    loadings: Record<Region, number>
  ): Promise<void> => {
    await api.put('/config/target-value-loadings', { target_value_loadings: loadings });
  },

  updateRegionalSplit: async (split: Record<Region, number>): Promise<void> => {
    await api.put('/config/regional-split', { regional_split: split });
  },

  resetRegionalSplit: async (): Promise<void> => {
    await api.delete('/config/regional-split');
  },

  getPortfolioTemplates: async (): Promise<PortfolioTemplatesState> => {
    const { data } = await api.get('/config/portfolio-templates');
    return data;
  },

  updatePortfolio: async (holdings: PortfolioHoldingItem[], vol?: number): Promise<void> => {
    await api.put('/config/portfolio', { holdings, vol });
  },

  resetPortfolio: async (): Promise<void> => {
    await api.delete('/config/portfolio');
  },

  getTargetProportions: async (useCache = false): Promise<TargetProportions> => {
    const { data } = await api.get('/config/target-proportions', {
      params: { use_cache: useCache },
    });
    return data;
  },
};

export const equitiesApi = {
  getPrices: async (useCache = false): Promise<Record<string, number>> => {
    const { data } = await api.get('/equities/prices', {
      params: { use_cache: useCache },
    });
    return data;
  },
};
