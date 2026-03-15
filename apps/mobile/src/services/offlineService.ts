import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = 'cache_';
const PENDING_ACTIONS_KEY = 'pending_offline_actions';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface PendingAction {
  id: string;
  type: 'complete_session' | 'skip_session' | 'reschedule_session' | 'add_note';
  payload: any;
  createdAt: number;
}

// Check network status
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

// Subscribe to network changes
export function subscribeToNetworkChanges(callback: (isConnected: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    callback(state.isConnected === true);
  });
}

// Cache data
export async function cacheData<T>(key: string, data: T, expiryMs: number = CACHE_EXPIRY_MS): Promise<void> {
  const cacheEntry: CachedData<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + expiryMs,
  };
  
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const cacheEntry: CachedData<T> = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > cacheEntry.expiresAt) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    
    return cacheEntry.data;
  } catch {
    return null;
  }
}

// Clear expired cache
export async function clearExpiredCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  
  for (const key of cacheKeys) {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      try {
        const entry = JSON.parse(cached);
        if (Date.now() > entry.expiresAt) {
          await AsyncStorage.removeItem(key);
        }
      } catch {
        // Invalid cache entry, remove it
        await AsyncStorage.removeItem(key);
      }
    }
  }
}

// Queue offline action
export async function queueOfflineAction(action: Omit<PendingAction, 'id' | 'createdAt'>): Promise<void> {
  const pending = await getPendingActions();
  
  const newAction: PendingAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  
  pending.push(newAction);
  await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pending));
}

// Get pending actions
export async function getPendingActions(): Promise<PendingAction[]> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Remove pending action
export async function removePendingAction(actionId: string): Promise<void> {
  const pending = await getPendingActions();
  const filtered = pending.filter(a => a.id !== actionId);
  await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(filtered));
}

// Clear all pending actions
export async function clearPendingActions(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_ACTIONS_KEY);
}

// Sync pending actions when online
export async function syncPendingActions(
  executor: (action: PendingAction) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  const online = await isOnline();
  if (!online) {
    return { success: 0, failed: 0 };
  }
  
  const pending = await getPendingActions();
  let success = 0;
  let failed = 0;
  
  for (const action of pending) {
    try {
      const result = await executor(action);
      if (result) {
        await removePendingAction(action.id);
        success++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  
  return { success, failed };
}

// Cache keys for common data
export const CACHE_KEYS = {
  SESSIONS_TODAY: 'sessions_today',
  SESSIONS_LATE: 'sessions_late',
  CATALOG: 'catalog',
  USER_SETTINGS: 'user_settings',
  PROGRESS: 'progress',
  EVENTS: (date: string) => `events_${date}`,
  SESSIONS: (date: string) => `sessions_${date}`,
};
