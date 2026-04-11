import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '../services/api';
import { useConfigStore } from '../store/configStore';

export const usePortfolio = () => {
  const { setUseCache } = useConfigStore();

  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const currentUseCache = useConfigStore.getState().useCache;
      try {
        return await portfolioApi.getPortfolio(currentUseCache);
      } catch (error) {
        if (!currentUseCache) {
          console.warn('Failed to fetch fresh data, falling back to cache');
          setUseCache(true);
          return await portfolioApi.getPortfolio(true);
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useRegionalDistribution = () => {
  return useQuery({
    queryKey: ['regionalDistribution'],
    queryFn: () => {
      const useCache = useConfigStore.getState().useCache;
      return portfolioApi.getRegionalDistribution(useCache);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useFactorAnalysis = () => {
  return useQuery({
    queryKey: ['factorAnalysis'],
    queryFn: () => {
      const useCache = useConfigStore.getState().useCache;
      return portfolioApi.getFactorAnalysis(useCache);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
