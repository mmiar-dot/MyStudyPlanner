import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

const OFFLINE_QUEUE_KEY = 'offline_queue';
const OFFLINE_CACHE_KEY = 'offline_cache';

export interface OfflineAction {
  id: string;
  type: 'complete_session' | 'skip_session' | 'reschedule_session' | 'add_note';
  payload: any;
  timestamp: number;
}

interface OfflineCache {
  sessions: any[];
  courses: any[];
  progress: any;
  lastSync: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private queue: OfflineAction[] = [];
  private cache: OfflineCache | null = null;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  
  constructor() {
    this.init();
  }
  
  private async init() {
    // Load queue from storage
    await this.loadQueue();
    await this.loadCache();
    
    // Start network monitoring (only on native)
    if (Platform.OS !== 'web') {
      NetInfo.addEventListener((state) => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? true;
        
        // If we just came online, try to sync
        if (!wasOnline && this.isOnline) {
          this.syncQueue();
        }
        
        // Notify listeners
        this.listeners.forEach((listener) => listener(this.isOnline));
      });
    } else {
      // Web: Use navigator.onLine
      if (typeof window !== 'undefined') {
        this.isOnline = navigator.onLine;
        window.addEventListener('online', () => {
          this.isOnline = true;
          this.syncQueue();
          this.listeners.forEach((listener) => listener(true));
        });
        window.addEventListener('offline', () => {
          this.isOnline = false;
          this.listeners.forEach((listener) => listener(false));
        });
      }
    }
  }
  
  /**
   * Check if device is online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }
  
  /**
   * Subscribe to network status changes
   */
  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Add an action to the offline queue
   */
  async addToQueue(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
    const fullAction: OfflineAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    
    this.queue.push(fullAction);
    await this.saveQueue();
    
    // Try to sync immediately if online
    if (this.isOnline) {
      await this.syncQueue();
    }
  }
  
  /**
   * Get pending actions in queue
   */
  getQueue(): OfflineAction[] {
    return [...this.queue];
  }
  
  /**
   * Clear the queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }
  
  /**
   * Sync queued actions with server
   */
  async syncQueue(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline || this.queue.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    let success = 0;
    let failed = 0;
    const remainingQueue: OfflineAction[] = [];
    
    for (const action of this.queue) {
      try {
        await this.executeAction(action);
        success++;
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        failed++;
        remainingQueue.push(action);
      }
    }
    
    this.queue = remainingQueue;
    await this.saveQueue();
    
    return { success, failed };
  }
  
  /**
   * Execute a single queued action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    const { api } = await import('@mystudyplanner/api-client');
    
    switch (action.type) {
      case 'complete_session':
        await api.post(`/sessions/${action.payload.sessionId}/complete`, {
          rating: action.payload.rating,
          notes: action.payload.notes,
        });
        break;
        
      case 'skip_session':
        await api.post(`/sessions/${action.payload.sessionId}/skip`, {
          reason: action.payload.reason,
        });
        break;
        
      case 'reschedule_session':
        await api.put(`/sessions/${action.payload.sessionId}/reschedule`, {
          new_date: action.payload.newDate,
        });
        break;
        
      case 'add_note':
        await api.post(`/catalog/items/${action.payload.itemId}/notes`, {
          content: action.payload.content,
        });
        break;
        
      default:
        console.warn('Unknown action type:', action.type);
    }
  }
  
  /**
   * Cache data for offline use
   */
  async cacheData(data: Partial<OfflineCache>): Promise<void> {
    this.cache = {
      ...this.cache,
      sessions: data.sessions ?? this.cache?.sessions ?? [],
      courses: data.courses ?? this.cache?.courses ?? [],
      progress: data.progress ?? this.cache?.progress ?? null,
      lastSync: Date.now(),
    };
    await this.saveCache();
  }
  
  /**
   * Get cached data
   */
  getCachedData(): OfflineCache | null {
    return this.cache;
  }
  
  /**
   * Get cached sessions for a specific date
   */
  getCachedSessions(date?: string): any[] {
    if (!this.cache?.sessions) return [];
    
    if (date) {
      return this.cache.sessions.filter((s) => s.scheduled_date === date);
    }
    
    return this.cache.sessions;
  }
  
  /**
   * Get cached courses
   */
  getCachedCourses(): any[] {
    return this.cache?.courses ?? [];
  }
  
  /**
   * Get cached progress
   */
  getCachedProgress(): any {
    return this.cache?.progress ?? null;
  }
  
  /**
   * Check if cache is stale (older than 1 hour)
   */
  isCacheStale(): boolean {
    if (!this.cache?.lastSync) return true;
    const oneHour = 60 * 60 * 1000;
    return Date.now() - this.cache.lastSync > oneHour;
  }
  
  // Storage helpers
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
    } catch {
      this.queue = [];
    }
  }
  
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }
  
  private async loadCache(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      this.cache = stored ? JSON.parse(stored) : null;
    } catch {
      this.cache = null;
    }
  }
  
  private async saveCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save offline cache:', error);
    }
  }
}

// Singleton instance
const offlineService = new OfflineService();
export default offlineService;

// React hook for using offline service
export function useOffline() {
  const [isOnline, setIsOnline] = React.useState(offlineService.getIsOnline());
  const [pendingActions, setPendingActions] = React.useState(offlineService.getQueue().length);
  
  React.useEffect(() => {
    const unsubscribe = offlineService.subscribe((online) => {
      setIsOnline(online);
      setPendingActions(offlineService.getQueue().length);
    });
    
    return unsubscribe;
  }, []);
  
  return {
    isOnline,
    pendingActions,
    addToQueue: offlineService.addToQueue.bind(offlineService),
    syncQueue: offlineService.syncQueue.bind(offlineService),
    cacheData: offlineService.cacheData.bind(offlineService),
    getCachedSessions: offlineService.getCachedSessions.bind(offlineService),
    getCachedCourses: offlineService.getCachedCourses.bind(offlineService),
    getCachedProgress: offlineService.getCachedProgress.bind(offlineService),
    isCacheStale: offlineService.isCacheStale.bind(offlineService),
  };
}

import React from 'react';
