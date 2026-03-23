import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  dailySessionsEnabled: boolean;       // Notifications for today's sessions
  lateSessionsEnabled: boolean;        // Notifications for late sessions
  dailyReminderHour: number;           // Hour (0-23)
  dailyReminderMinute: number;         // Minute (0-59)
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  dailySessionsEnabled: true,
  lateSessionsEnabled: true,
  dailyReminderHour: 8,
  dailyReminderMinute: 0,
};

const NOTIFICATION_PREFS_KEY = 'notification_preferences_v2';

interface NotificationState {
  preferences: NotificationPreferences;
  isLoading: boolean;
  permissionGranted: boolean | null;
  loadPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  setPermissionStatus: (granted: boolean) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  preferences: DEFAULT_PREFERENCES,
  isLoading: true,
  permissionGranted: null,
  
  loadPreferences: async () => {
    try {
      set({ isLoading: true });
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ preferences: { ...DEFAULT_PREFERENCES, ...parsed }, isLoading: false });
      } else {
        set({ preferences: DEFAULT_PREFERENCES, isLoading: false });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      set({ isLoading: false });
    }
  },
  
  updatePreferences: async (prefs: Partial<NotificationPreferences>) => {
    try {
      const newPrefs = { ...get().preferences, ...prefs };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(newPrefs));
      set({ preferences: newPrefs });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  },
  
  setPermissionStatus: (granted: boolean) => {
    set({ permissionGranted: granted });
  },
  
  reset: () => {
    set({
      preferences: DEFAULT_PREFERENCES,
      isLoading: false,
      permissionGranted: null,
    });
  },
}));
