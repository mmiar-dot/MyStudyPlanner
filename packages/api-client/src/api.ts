import axios from 'axios';
import { Platform } from 'react-native';

// These will be injected by the consuming app
let SecureStore: any = null;
let AsyncStorage: any = null;

export const configureStorage = (secureStore: any, asyncStorage: any) => {
  SecureStore = secureStore;
  AsyncStorage = asyncStorage;
};

const TOKEN_KEY = 'auth_token';

// Cache the token in memory for faster access
let cachedToken: string | null = null;

export const getToken = async (): Promise<string | null> => {
  if (cachedToken) {
    return cachedToken;
  }
  
  try {
    let token: string | null = null;
    if (Platform.OS === 'web') {
      if (AsyncStorage) {
        token = await AsyncStorage.getItem(TOKEN_KEY);
      }
    } else {
      if (SecureStore) {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
      }
    }
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  cachedToken = token;
  
  try {
    if (Platform.OS === 'web') {
      if (AsyncStorage) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      }
    } else {
      if (SecureStore) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    }
  } catch (e) {
    console.error('Error saving token:', e);
  }
};

export const removeToken = async (): Promise<void> => {
  cachedToken = null;
  
  try {
    if (Platform.OS === 'web') {
      if (AsyncStorage) {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    } else {
      if (SecureStore) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    }
  } catch (e) {
    console.error('Error removing token:', e);
  }
};

// Create API instance
let apiInstance: ReturnType<typeof axios.create> | null = null;

export const createApiClient = (baseURL: string) => {
  apiInstance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add auth interceptor
  apiInstance.interceptors.request.use(
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
  apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        removeToken();
      }
      return Promise.reject(error);
    }
  );

  return apiInstance;
};

export const getApiClient = () => {
  if (!apiInstance) {
    throw new Error('API client not initialized. Call createApiClient first.');
  }
  return apiInstance;
};

export default {
  createApiClient,
  getApiClient,
  configureStorage,
  getToken,
  setToken,
  removeToken,
};
