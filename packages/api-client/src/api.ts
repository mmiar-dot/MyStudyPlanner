import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get backend URL from multiple sources for reliability
const getBackendUrl = (): string => {
  // 1. Try expo-constants (works in EAS builds)
  const expoExtra = Constants.expoConfig?.extra;
  if (expoExtra?.backendUrl) {
    return expoExtra.backendUrl;
  }
  
  // 2. Try environment variable (works in development)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  
  // 3. Fallback to production URL
  return 'https://mystudyplanner-production.up.railway.app';
};

const BACKEND_URL = getBackendUrl();
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Token storage helpers
const TOKEN_KEY = 'auth_token';

// Cache the token in memory for faster access
let cachedToken: string | null = null;

export const getToken = async (): Promise<string | null> => {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken;
  }
  
  try {
    let token: string | null = null;
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem(TOKEN_KEY);
    } else {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    // Update cache
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  // Update cache immediately
  cachedToken = token;
  
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (e) {
    console.error('Error saving token:', e);
  }
};

export const removeToken = async (): Promise<void> => {
  // Clear cache immediately
  cachedToken = null;
  
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (e) {
    console.error('Error removing token:', e);
  }
};

// Add auth interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
    }
    return Promise.reject(error);
  }
);

export default api;
