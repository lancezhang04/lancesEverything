import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { exchangeApi, getToken } from '../services/exchangeApi';
import { ExchangeState } from '../types/exchange';

const STATE_KEY = ['exchange-state'];

/**
 * The whole client reads from this one polled query — products, positions and
 * the user list all arrive together, so mutations only ever invalidate one key.
 */
export const useExchangeState = (enabled: boolean) =>
  useQuery<ExchangeState>({
    queryKey: STATE_KEY,
    queryFn: exchangeApi.getState,
    refetchInterval: 2000,
    enabled: enabled && !!getToken(),
  });

/** Wraps any exchange call so it refreshes the shared state on success. */
export const useExchangeAction = <TArgs extends unknown[]>(
  action: (...args: TArgs) => Promise<unknown>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => action(...args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATE_KEY }),
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      exchangeApi.login(username, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATE_KEY }),
  });
};
