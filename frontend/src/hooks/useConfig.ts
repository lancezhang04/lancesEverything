import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, equitiesApi } from '../services/api';
import { useConfigStore } from '../store/configStore';
import { FactorPremiums, EquityConfig, PortfolioHoldingItem } from '../types/config';
import { Region } from '../types/portfolio';

export const useConfig = () => {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => configApi.getConfig(),
    staleTime: Infinity, // Config rarely changes, keep it cached
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useTargetProportions = () => {
  return useQuery({
    queryKey: ['targetProportions'],
    queryFn: () => {
      const useCache = useConfigStore.getState().useCache;
      return configApi.getTargetProportions(useCache);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useUpdateFactorPremiums = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (factorPremiums: FactorPremiums) =>
      configApi.updateFactorPremiums(factorPremiums),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['factorAnalysis'] });
    },
  });
};

export const useUpdateEquityConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticker, config }: { ticker: string; config: EquityConfig }) =>
      configApi.updateEquityConfig(ticker, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['targetProportions'] });
      queryClient.invalidateQueries({ queryKey: ['factorAnalysis'] });
    },
  });
};

export const useUpdateRegionalSplit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (split: Record<Region, number>) =>
      configApi.updateRegionalSplit(split),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targetProportions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['factorAnalysis'] });
    },
  });
};

export const useResetRegionalSplit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => configApi.resetRegionalSplit(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targetProportions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['factorAnalysis'] });
    },
  });
};

export const useUpdateTargetValueLoadings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loadings: Record<Region, number>) =>
      configApi.updateTargetValueLoadings(loadings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['targetProportions'] });
      queryClient.invalidateQueries({ queryKey: ['factorAnalysis'] });
    },
  });
};

export const useEquityPrices = () => {
  return useQuery({
    queryKey: ['equityPrices'],
    queryFn: () => {
      const useCache = useConfigStore.getState().useCache;
      return equitiesApi.getPrices(useCache);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePortfolioTemplates = () => {
  return useQuery({
    queryKey: ['portfolioTemplates'],
    queryFn: () => configApi.getPortfolioTemplates(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

const ALL_DATA_KEYS = ['portfolio', 'regionalDistribution', 'factorAnalysis', 'targetProportions', 'portfolioTemplates'];

export const useUpdatePortfolio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holdings, vol }: { holdings: PortfolioHoldingItem[]; vol?: number }) =>
      configApi.updatePortfolio(holdings, vol),
    onSuccess: () => {
      ALL_DATA_KEYS.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    },
  });
};

export const useResetPortfolio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => configApi.resetPortfolio(),
    onSuccess: () => {
      ALL_DATA_KEYS.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    },
  });
};
