import { create, StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Custom simple persist middleware for web compatibility
// This avoids the import.meta issue from zustand/middleware on web
type StorageValue<S> = { state: S; version?: number };

const createWebStorage = () => ({
  getItem: (name: string): StorageValue<any> | null => {
    if (typeof window === 'undefined') return null;
    try {
      const value = window.localStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<any>) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch {}
    }
  },
  removeItem: (name: string) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(name);
      } catch {}
    }
  },
});

const createAsyncStorageAdapter = () => ({
  getItem: async (name: string): Promise<StorageValue<any> | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: StorageValue<any>) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    } catch {}
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {}
  },
});

// Badge definitions
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  color: string;
  requirement: number;
  type: 'sessions' | 'streak' | 'courses' | 'perfect_days';
}

export const BADGES: Badge[] = [
  // Session badges
  { id: 'first_session', name: 'Premier pas', description: 'Terminer votre première session', icon: 'footsteps', color: '#10B981', requirement: 1, type: 'sessions' },
  { id: 'sessions_10', name: 'En route', description: 'Terminer 10 sessions', icon: 'walk', color: '#3B82F6', requirement: 10, type: 'sessions' },
  { id: 'sessions_50', name: 'Marathonien', description: 'Terminer 50 sessions', icon: 'bicycle', color: '#8B5CF6', requirement: 50, type: 'sessions' },
  { id: 'sessions_100', name: 'Centurion', description: 'Terminer 100 sessions', icon: 'medal', color: '#F59E0B', requirement: 100, type: 'sessions' },
  { id: 'sessions_500', name: 'Légende', description: 'Terminer 500 sessions', icon: 'trophy', color: '#EF4444', requirement: 500, type: 'sessions' },
  
  // Streak badges
  { id: 'streak_3', name: 'Régulier', description: '3 jours consécutifs', icon: 'flame', color: '#F97316', requirement: 3, type: 'streak' },
  { id: 'streak_7', name: 'Semaine parfaite', description: '7 jours consécutifs', icon: 'flame', color: '#EF4444', requirement: 7, type: 'streak' },
  { id: 'streak_30', name: 'Mois de feu', description: '30 jours consécutifs', icon: 'bonfire', color: '#DC2626', requirement: 30, type: 'streak' },
  { id: 'streak_100', name: 'Inarrêtable', description: '100 jours consécutifs', icon: 'rocket', color: '#7C3AED', requirement: 100, type: 'streak' },
  
  // Course badges
  { id: 'courses_1', name: 'Curieux', description: 'Configurer 1 cours', icon: 'book', color: '#06B6D4', requirement: 1, type: 'courses' },
  { id: 'courses_5', name: 'Étudiant', description: 'Configurer 5 cours', icon: 'library', color: '#0EA5E9', requirement: 5, type: 'courses' },
  { id: 'courses_10', name: 'Érudit', description: 'Configurer 10 cours', icon: 'school', color: '#2563EB', requirement: 10, type: 'courses' },
  
  // Perfect days badges
  { id: 'perfect_1', name: 'Jour parfait', description: '1 journée sans retard', icon: 'star', color: '#FBBF24', requirement: 1, type: 'perfect_days' },
  { id: 'perfect_7', name: 'Semaine étoilée', description: '7 jours parfaits', icon: 'star', color: '#F59E0B', requirement: 7, type: 'perfect_days' },
  { id: 'perfect_30', name: 'Mois d\'or', description: '30 jours parfaits', icon: 'star', color: '#D97706', requirement: 30, type: 'perfect_days' },
];

// Level calculation
export const calculateLevel = (xp: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } => {
  // XP required for each level: 100, 250, 500, 1000, 2000, ...
  const levels = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];
  
  let level = 1;
  for (let i = 1; i < levels.length; i++) {
    if (xp >= levels[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  const currentLevelXP = levels[level - 1] || 0;
  const nextLevelXP = levels[level] || levels[levels.length - 1] * 2;
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const progress = Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);
  
  return { level, currentXP: xp, nextLevelXP, progress };
};

// XP rewards
export const XP_REWARDS = {
  complete_session: 10,
  streak_day: 5,
  perfect_day: 20,
  unlock_badge: 50,
  complete_course: 100,
};

// Simple persist wrapper compatible with both web and mobile
const simplePersist = <T extends object>(
  name: string, 
  initializer: StateCreator<T>
): StateCreator<T> => {
  return (set, get, api) => {
    const storage = Platform.OS === 'web' ? createWebStorage() : createAsyncStorageAdapter();
    
    // Load initial state from storage
    const loadState = async () => {
      try {
        const stored = await storage.getItem(name);
        if (stored?.state) {
          set(stored.state as T);
        }
      } catch {}
    };
    
    // Wrap set to persist on every update
    const persistSet: typeof set = (...args) => {
      set(...args);
      // Save state after update
      setTimeout(async () => {
        try {
          await storage.setItem(name, { state: get() as T });
        } catch {}
      }, 0);
    };
    
    // Load state on init
    loadState();
    
    return initializer(persistSet, get, api);
  };
};

interface GamificationState {
  xp: number;
  unlockedBadges: string[];
  perfectDays: number;
  lastCheckedDate: string | null;
  
  // Actions
  addXP: (amount: number, reason?: string) => void;
  checkAndUnlockBadges: (stats: { sessions: number; streak: number; courses: number }) => string[];
  recordPerfectDay: () => void;
  getLevel: () => { level: number; currentXP: number; nextLevelXP: number; progress: number };
  getUnlockedBadges: () => Badge[];
  getLockedBadges: () => Badge[];
}

export const useGamificationStore = create<GamificationState>()(
  simplePersist(
    'gamification-storage',
    (set, get) => ({
      xp: 0,
      unlockedBadges: [],
      perfectDays: 0,
      lastCheckedDate: null,
      
      addXP: (amount: number, reason?: string) => {
        set((state) => ({ ...state, xp: state.xp + amount }));
        console.log(`+${amount} XP${reason ? ` (${reason})` : ''}`);
      },
      
      checkAndUnlockBadges: (stats) => {
        const { unlockedBadges, perfectDays } = get();
        const newBadges: string[] = [];
        
        BADGES.forEach((badge) => {
          if (unlockedBadges.includes(badge.id)) return;
          
          let shouldUnlock = false;
          switch (badge.type) {
            case 'sessions':
              shouldUnlock = stats.sessions >= badge.requirement;
              break;
            case 'streak':
              shouldUnlock = stats.streak >= badge.requirement;
              break;
            case 'courses':
              shouldUnlock = stats.courses >= badge.requirement;
              break;
            case 'perfect_days':
              shouldUnlock = perfectDays >= badge.requirement;
              break;
          }
          
          if (shouldUnlock) {
            newBadges.push(badge.id);
          }
        });
        
        if (newBadges.length > 0) {
          set((state) => ({
            ...state,
            unlockedBadges: [...state.unlockedBadges, ...newBadges],
            xp: state.xp + (newBadges.length * XP_REWARDS.unlock_badge),
          }));
        }
        
        return newBadges;
      },
      
      recordPerfectDay: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastCheckedDate } = get();
        
        if (lastCheckedDate !== today) {
          set((state) => ({
            ...state,
            perfectDays: state.perfectDays + 1,
            lastCheckedDate: today,
            xp: state.xp + XP_REWARDS.perfect_day,
          }));
        }
      },
      
      getLevel: () => {
        return calculateLevel(get().xp);
      },
      
      getUnlockedBadges: () => {
        const { unlockedBadges } = get();
        return BADGES.filter((b) => unlockedBadges.includes(b.id));
      },
      
      getLockedBadges: () => {
        const { unlockedBadges } = get();
        return BADGES.filter((b) => !unlockedBadges.includes(b.id));
      },
    })
  )
);
