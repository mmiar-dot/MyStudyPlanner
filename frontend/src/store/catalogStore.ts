import { create } from 'zustand';
import api from '../services/api';
import { CatalogItem, UserItemSettings, RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '../types';

interface CatalogState {
  items: CatalogItem[];
  allItems: CatalogItem[];
  userSettings: UserItemSettings[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (parentId?: string | null) => Promise<void>;
  fetchAllItems: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  setItemMethod: (
    itemId: string,
    method: RevisionMethod,
    jSettings?: JMethodSettings,
    srsSettings?: SRSSettings,
    toursSettings?: ToursSettings
  ) => Promise<void>;
  getItemSettings: (itemId: string) => UserItemSettings | undefined;
  createPersonalCourse: (title: string, parentId?: string | null, description?: string) => Promise<void>;
  deletePersonalCourse: (itemId: string) => Promise<void>;
  hideItem: (itemId: string) => Promise<void>;
  unhideItem: (itemId: string) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  items: [],
  allItems: [],
  userSettings: [],
  isLoading: false,
  error: null,

  fetchItems: async (parentId?: string | null) => {
    try {
      set({ isLoading: true });
      const url = parentId ? `/catalog?parent_id=${parentId}` : '/catalog';
      const response = await api.get<CatalogItem[]>(url);
      set({ items: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAllItems: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<CatalogItem[]>('/catalog/all');
      set({ allItems: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchUserSettings: async () => {
    try {
      const response = await api.get<UserItemSettings[]>('/user/items/settings');
      set({ userSettings: response.data });
    } catch (error: any) {
      set({ error: error.message });
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
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getItemSettings: (itemId: string) => {
    return get().userSettings.find((s) => s.item_id === itemId);
  },

  createPersonalCourse: async (title: string, parentId?: string | null, description?: string) => {
    try {
      await api.post('/user/courses', {
        title,
        parent_id: parentId || null,
        description,
      });
      await get().fetchAllItems();
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
}));
