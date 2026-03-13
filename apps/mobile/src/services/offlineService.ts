import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { StudySession, CatalogItem, PersonalEvent, ICSSubscription } from '../types';

// Storage keys
const KEYS = {
  SESSIONS_CACHE: '@revisionmed_sessions',
  CATALOG_CACHE: '@revisionmed_catalog',
  EVENTS_CACHE: '@revisionmed_events',
  ICS_CACHE: '@revisionmed_ics',
  PENDING_ACTIONS: '@revisionmed_pending_actions',
  LAST_SYNC: '@revisionmed_last_sync',
  USER_CACHE: '@revisionmed_user',
};

interface PendingAction {
  id: string;
  type: 'complete_session' | 'create_event' | 'delete_event' | 'update_settings';
  payload: any;
  timestamp: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private pendingActions: PendingAction[] = [];
  private syncInProgress: boolean = false;

  constructor() {
    this.initNetworkListener();
    this.loadPendingActions();
  }

  private initNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        // Just came online - sync pending actions
        this.syncPendingActions();
      }

      console.log('Network status:', this.isOnline ? 'Online' : 'Offline');
    });
  }

  async getNetworkStatus(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  // =============================
  // CACHING METHODS
  // =============================

  async cacheSessions(sessions: StudySession[]) {
    const cached: CachedData<StudySession[]> = {
      data: sessions,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEYS.SESSIONS_CACHE, JSON.stringify(cached));
  }

  async getCachedSessions(): Promise<StudySession[] | null> {
    try {
      const json = await AsyncStorage.getItem(KEYS.SESSIONS_CACHE);
      if (!json) return null;
      const cached: CachedData<StudySession[]> = JSON.parse(json);
      return cached.data;
    } catch {
      return null;
    }
  }

  async cacheCatalog(items: CatalogItem[]) {
    const cached: CachedData<CatalogItem[]> = {
      data: items,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEYS.CATALOG_CACHE, JSON.stringify(cached));
  }

  async getCachedCatalog(): Promise<CatalogItem[] | null> {
    try {
      const json = await AsyncStorage.getItem(KEYS.CATALOG_CACHE);
      if (!json) return null;
      const cached: CachedData<CatalogItem[]> = JSON.parse(json);
      return cached.data;
    } catch {
      return null;
    }
  }

  async cacheEvents(events: PersonalEvent[]) {
    const cached: CachedData<PersonalEvent[]> = {
      data: events,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEYS.EVENTS_CACHE, JSON.stringify(cached));
  }

  async getCachedEvents(): Promise<PersonalEvent[] | null> {
    try {
      const json = await AsyncStorage.getItem(KEYS.EVENTS_CACHE);
      if (!json) return null;
      const cached: CachedData<PersonalEvent[]> = JSON.parse(json);
      return cached.data;
    } catch {
      return null;
    }
  }

  async cacheICS(subscriptions: ICSSubscription[]) {
    const cached: CachedData<ICSSubscription[]> = {
      data: subscriptions,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEYS.ICS_CACHE, JSON.stringify(cached));
  }

  async getCachedICS(): Promise<ICSSubscription[] | null> {
    try {
      const json = await AsyncStorage.getItem(KEYS.ICS_CACHE);
      if (!json) return null;
      const cached: CachedData<ICSSubscription[]> = JSON.parse(json);
      return cached.data;
    } catch {
      return null;
    }
  }

  // =============================
  // PENDING ACTIONS
  // =============================

  private async loadPendingActions() {
    try {
      const json = await AsyncStorage.getItem(KEYS.PENDING_ACTIONS);
      if (json) {
        this.pendingActions = JSON.parse(json);
      }
    } catch {
      this.pendingActions = [];
    }
  }

  private async savePendingActions() {
    await AsyncStorage.setItem(KEYS.PENDING_ACTIONS, JSON.stringify(this.pendingActions));
  }

  async addPendingAction(type: PendingAction['type'], payload: any) {
    const action: PendingAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.pendingActions.push(action);
    await this.savePendingActions();

    // Try to sync if online
    if (this.isOnline) {
      this.syncPendingActions();
    }
  }

  async syncPendingActions(): Promise<boolean> {
    if (this.syncInProgress || this.pendingActions.length === 0) return true;

    this.syncInProgress = true;
    const successfulIds: string[] = [];

    try {
      for (const action of this.pendingActions) {
        const success = await this.executeAction(action);
        if (success) {
          successfulIds.push(action.id);
        }
      }

      // Remove successful actions
      this.pendingActions = this.pendingActions.filter(
        (a) => !successfulIds.includes(a.id)
      );
      await this.savePendingActions();

      // Update last sync timestamp
      await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());

      return this.pendingActions.length === 0;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeAction(action: PendingAction): Promise<boolean> {
    // This will be implemented with actual API calls
    // For now, just simulate success
    try {
      console.log('Executing pending action:', action.type, action.payload);
      return true;
    } catch {
      return false;
    }
  }

  getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  // =============================
  // UTILITY METHODS
  // =============================

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(KEYS.LAST_SYNC);
      if (!timestamp) return null;
      return new Date(parseInt(timestamp));
    } catch {
      return null;
    }
  }

  async clearAllCache() {
    await AsyncStorage.multiRemove([
      KEYS.SESSIONS_CACHE,
      KEYS.CATALOG_CACHE,
      KEYS.EVENTS_CACHE,
      KEYS.ICS_CACHE,
    ]);
  }

  async clearAll() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    this.pendingActions = [];
  }

  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }
}

export const offlineService = new OfflineService();
export default offlineService;
