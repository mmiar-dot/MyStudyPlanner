import { create } from 'zustand';
import api, { setToken, removeToken, getToken } from '../services/api';
import { User, AuthToken } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Theme settings (stored in memory only for now)
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleAuth: (idToken: string, email: string, name: string) => Promise<void>;
  appleAuth: (identityToken: string, userId: string, email?: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false, // Changed to false by default
  isAuthenticated: false,
  error: null,
  theme: 'system', // Default to system theme
  accentColor: '#3B82F6',

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    set({ theme });
  },

  setAccentColor: (color: string) => {
    set({ accentColor: color });
  },

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

  appleAuth: async (identityToken: string, userId: string, email?: string, fullName?: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post<AuthToken>('/auth/apple', { 
        identity_token: identityToken, 
        user_id: userId,
        email,
        full_name: fullName
      });
      await setToken(response.data.access_token);
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Erreur Apple Auth', 
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

  requestPasswordReset: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.post('/auth/forgot-password', { email });
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Erreur lors de la demande', 
        isLoading: false 
      });
      throw error;
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Erreur lors de la réinitialisation', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// Simplified hydration hook - always returns true
export const useAuthHydration = () => true;
