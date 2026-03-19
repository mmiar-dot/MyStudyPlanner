import { create } from 'zustand';
import api from '../api';
import { CatalogItem, UserItemSettings, RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '../types';

export interface CustomSection {
  id: string;
  user_id: string;
  name: string;
  color: string;
  order: number;
  created_at: string;
}

// Callback to notify session stores to refresh
let sessionRefreshCallback: (() => Promise<void>) | null = null;
let calendarRefreshCallback: ((month: number, year: number) => Promise<void>) | null = null;

export const setSessionRefreshCallback = (callback: () => Promise<void>) => {
  sessionRefreshCallback = callback;
};

export const setCalendarRefreshCallback = (callback: (month: number, year: number) => Promise<void>) => {
  calendarRefreshCallback = callback;
};

interface CatalogState {
  items: CatalogItem[];
  allItems: CatalogItem[];
  userSettings: UserItemSettings[];
  customSections: CustomSection[];
  itemColors: Record<string, string>;
  itemSections: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  fetchItems: (parentId?: string | null) => Promise<void>;
  fetchAllItems: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  fetchCustomSections: () => Promise<void>;
  fetchItemColors: () => Promise<void>;
  fetchItemSections: () => Promise<void>;
  setItemMethod: (
    itemId: string,
    method: RevisionMethod,
    jSettings?: JMethodSettings,
    srsSettings?: SRSSettings,
    toursSettings?: ToursSettings
  ) => Promise<void>;
  getItemSettings: (itemId: string) => UserItemSettings | undefined;
  createPersonalCourse: (title: string, parentId?: string | null, description?: string, color?: string) => Promise<void>;
  deletePersonalCourse: (itemId: string) => Promise<void>;
  renameCourse: (itemId: string, newTitle: string) => Promise<void>;
  hideItem: (itemId: string) => Promise<void>;
  unhideItem: (itemId: string) => Promise<void>;
  createSection: (name: string, color: string) => Promise<void>;
  updateSection: (sectionId: string, name: string, color: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  setItemColor: (itemId: string, color: string) => Promise<void>;
  assignItemToSection: (itemId: string, sectionId: string) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  items: [],
  allItems: [],
  userSettings: [],
  customSections: [],
  itemColors: {},
  itemSections: {},
  isLoading: false,
  error: null,

  fetchItems: async (parentId?: string | null) => {
    try {
      set({ isLoading: true });
      const url = parentId ? `/catalog?parent_id=${parentId}` : '/catalog';
      const response = await api.get<CatalogItem[]>(url);
      const data = Array.isArray(response.data) ? response.data : [];
      set({ items: data, isLoading: false });
    } catch (error: any) {
      set({ items: [], error: error.message, isLoading: false });
    }
  },

  fetchAllItems: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<CatalogItem[]>('/catalog/all');
      const data = Array.isArray(response.data) ? response.data : [];
      set({ allItems: data, isLoading: false });
    } catch (error: any) {
      set({ allItems: [], error: error.message, isLoading: false });
    }
  },

  fetchUserSettings: async () => {
    try {
      const response = await api.get<UserItemSettings[]>('/user/items/settings');
      const data = Array.isArray(response.data) ? response.data : [];
      set({ userSettings: data });
    } catch (error: any) {
      set({ userSettings: [], error: error.message });
    }
  },

  fetchCustomSections: async () => {
    try {
      const response = await api.get<CustomSection[]>('/user/sections');
      const data = Array.isArray(response.data) ? response.data : [];
      set({ customSections: data });
    } catch (error: any) {
      set({ customSections: [], error: error.message });
    }
  },

  fetchItemColors: async () => {
    try {
      const response = await api.get<Record<string, string>>('/user/colors');
      const data = response.data && typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : {};
      set({ itemColors: data });
    } catch (error: any) {
      set({ itemColors: {}, error: error.message });
    }
  },

  fetchItemSections: async () => {
    try {
      const response = await api.get<Record<string, string>>('/user/items/sections');
      const data = response.data && typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : {};
      set({ itemSections: data });
    } catch (error: any) {
      set({ itemSections: {}, error: error.message });
    }
  },

  setItemMethod: async (itemId, method, jSettings, srsSettings, toursSettings) => {
    try {
      await api.post('/user/items/settings', {
        item_id: itemId,
        method,
        j_settings: jSettings,
        srs_settings: srsSettings,
        tours_settings: toursSettings,
      });
      await get().fetchUserSettings();
      
      // Refresh sessions after a short delay to allow backend to generate sessions
      setTimeout(async () => {
        if (sessionRefreshCallback) {
          await sessionRefreshCallback();
        }
        if (calendarRefreshCallback) {
          const now = new Date();
          await calendarRefreshCallback(now.getMonth() + 1, now.getFullYear());
        }
      }, 500);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getItemSettings: (itemId: string) => {
    return get().userSettings.find((s) => s.item_id === itemId);
  },

  createPersonalCourse: async (title: string, parentId?: string | null, description?: string, color?: string) => {
    try {
      const response = await api.post('/user/courses', {
        title,
        parent_id: parentId || null,
        description,
        color: color || '#3B82F6',
      });
      
      // Get the created course ID from response and save color
      const createdCourse = response.data;
      const courseId = createdCourse?.id || createdCourse?.item_id;
      const courseColor = color || '#3B82F6';
      
      // Save color immediately to user colors
      if (courseId && courseColor) {
        await api.post('/user/colors', { item_id: courseId, color: courseColor });
        set((state) => ({
          itemColors: { ...state.itemColors, [courseId]: courseColor }
        }));
      }
      
      await get().fetchAllItems();
      
      // Refresh sessions and calendar to show the new course
      setTimeout(async () => {
        if (sessionRefreshCallback) {
          await sessionRefreshCallback();
        }
        if (calendarRefreshCallback) {
          const now = new Date();
          await calendarRefreshCallback(now.getMonth() + 1, now.getFullYear());
        }
      }, 300);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deletePersonalCourse: async (itemId: string) => {
    try {
      await api.delete(`/user/courses/${itemId}`);
      await get().fetchAllItems();
      await get().fetchUserSettings();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  renameCourse: async (itemId: string, newTitle: string) => {
    try {
      await api.put(`/user/courses/${itemId}`, { title: newTitle });
      await get().fetchAllItems();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  hideItem: async (itemId: string) => {
    try {
      await api.post('/user/hidden', { item_id: itemId });
      await get().fetchAllItems();
      await get().fetchUserSettings();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  unhideItem: async (itemId: string) => {
    try {
      await api.delete(`/user/hidden/${itemId}`);
      await get().fetchAllItems();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  createSection: async (name: string, color: string) => {
    try {
      await api.post('/user/sections', { name, color });
      await get().fetchCustomSections();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateSection: async (sectionId: string, name: string, color: string) => {
    try {
      await api.put(`/user/sections/${sectionId}`, { name, color });
      await get().fetchCustomSections();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteSection: async (sectionId: string) => {
    try {
      await api.delete(`/user/sections/${sectionId}`);
      await get().fetchCustomSections();
      await get().fetchItemSections();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setItemColor: async (itemId: string, color: string) => {
    try {
      await api.post('/user/colors', { item_id: itemId, color });
      set((state) => ({
        itemColors: { ...state.itemColors, [itemId]: color }
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  assignItemToSection: async (itemId: string, sectionId: string) => {
    try {
      await api.post(`/user/items/${itemId}/section?section_id=${sectionId}`);
      set((state) => ({
        itemSections: { ...state.itemSections, [itemId]: sectionId }
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
