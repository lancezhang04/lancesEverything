import axios from 'axios';
import type {
  DefaultsResponse,
  PlacementRequest,
  PlacementResponse,
} from '../types/placement';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
});

export const placementApi = {
  defaults: async (): Promise<DefaultsResponse> => {
    const { data } = await api.get('/placement/defaults');
    return data;
  },
  solve: async (request: PlacementRequest): Promise<PlacementResponse> => {
    const { data } = await api.post('/placement/solve', { request });
    return data;
  },
};
