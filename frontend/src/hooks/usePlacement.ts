import { useMutation, useQuery } from '@tanstack/react-query';
import { placementApi } from '../services/placementApi';
import type { PlacementRequest } from '../types/placement';

const STALE_TIME = 5 * 60 * 1000;

/** Defaults are fetched once; the reference yields behind them are cached server-side. */
export const useDefaults = () =>
  useQuery({
    queryKey: ['placement-defaults'],
    queryFn: placementApi.defaults,
    staleTime: STALE_TIME,
  });

/**
 * Inputs are ephemeral React state, so the solve is a mutation fired on every
 * edit rather than a keyed query. Nothing is persisted between sessions.
 */
export const useSolve = () =>
  useMutation({
    mutationFn: (request: PlacementRequest) => placementApi.solve(request),
  });
