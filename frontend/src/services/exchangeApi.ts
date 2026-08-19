import axios from 'axios';
import { ExchangeState, LoginResponse, Product } from '../types/exchange';

const TOKEN_KEY = 'exchange_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/exchange`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A stale token survives a backend restart in localStorage but not in memory,
// so drop it and fall back to the login screen rather than looping on 401s.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) clearToken();
    return Promise.reject(error);
  }
);

/** Pull the message the backend meant for the player out of an axios error. */
export const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? error.message;
  }
  return String(error);
};

export const exchangeApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/login', { username, password });
    return data;
  },

  getState: async (): Promise<ExchangeState> => {
    const { data } = await api.get('/state');
    return data;
  },

  join: (id: number) => api.post(`/products/${id}/join`),
  quote: (id: number, bid: number, ask: number) => api.post(`/products/${id}/quote`, { bid, ask }),
  pass: (id: number) => api.post(`/products/${id}/pass`),
  trade: (id: number, side: 'BUY' | 'SELL') => api.post(`/products/${id}/trade`, { side }),

  createProduct: async (product: {
    name: string;
    description: string;
    expiry: string;
    unit_value: number;
  }): Promise<Product> => {
    const { data } = await api.post('/products', product);
    return data;
  },
  setValue: (id: number, value: number) => api.put(`/products/${id}/value`, { value }),
  settle: (id: number, value: number | null) => api.post(`/products/${id}/settle`, { value }),
  advance: (id: number) => api.post(`/products/${id}/advance`),
  deleteUser: (username: string) => api.delete(`/users/${username}`),

  /** The export route needs an auth header, so fetch it as a blob rather than linking to it. */
  downloadSession: async () => {
    const { data } = await api.get('/export.json', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },
};
