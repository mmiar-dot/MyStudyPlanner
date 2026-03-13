import { create } from 'zustand';
import api, { setToken, removeToken, getToken } from '../api';
import { User, AuthToken } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleAuth: (idToken: string, email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post<AuthToken>('/auth/login', { email, password });
      await setToken(response.data.access_token);
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Erreur de connexion', 
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post<AuthToken>('/auth/register', { email, password, name });
      await setToken(response.data.access_token);
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || "Erreur d'inscription", 
        isLoading: false 
      });
      throw error;
    }
  },

  googleAuth: async (idToken: string, email: string, name: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post<AuthToken>('/auth/google', { 
        id_token: idToken, 
        email, 
        name 
      });
      await setToken(response.data.access_token);
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Erreur Google Auth', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: async () => {
    await removeToken();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      await removeToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
