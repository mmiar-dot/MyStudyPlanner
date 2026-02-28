import { create } from 'zustand';
import api from '../services/api';
import { PersonalEvent, ICSSubscription, ICSEvent, RecurrenceRule } from '../types';

interface EventState {
  events: PersonalEvent[];
  icsSubscriptions: ICSSubscription[];
  icsEvents: Record<string, ICSEvent[]>;
  isLoading: boolean;
  error: string | null;
  fetchEvents: (startDate?: string, endDate?: string) => Promise<void>;
  createEvent: (event: Omit<PersonalEvent, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateEvent: (eventId: string, event: Omit<PersonalEvent, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  fetchICSSubscriptions: () => Promise<void>;
  subscribeICS: (name: string, url: string, color: string) => Promise<void>;
  syncICS: (subscriptionId: string) => Promise<void>;
  deleteICSSubscription: (subscriptionId: string) => Promise<void>;
  fetchICSEvents: (subscriptionId: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  icsSubscriptions: [],
  icsEvents: {},
  isLoading: false,
  error: null,

  fetchEvents: async (startDate?: string, endDate?: string) => {
    try {
      set({ isLoading: true });
      let url = '/events';
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const response = await api.get<PersonalEvent[]>(url);
      set({ events: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createEvent: async (event) => {
    try {
      await api.post('/events', event);
      await get().fetchEvents();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateEvent: async (eventId, event) => {
    try {
      await api.put(`/events/${eventId}`, event);
      await get().fetchEvents();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteEvent: async (eventId) => {
    try {
      await api.delete(`/events/${eventId}`);
      await get().fetchEvents();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchICSSubscriptions: async () => {
    try {
      const response = await api.get<ICSSubscription[]>('/ics/subscriptions');
      set({ icsSubscriptions: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  subscribeICS: async (name, url, color) => {
    try {
      await api.post('/ics/subscribe', { name, url, color });
      await get().fetchICSSubscriptions();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  syncICS: async (subscriptionId) => {
    try {
      await api.post(`/ics/${subscriptionId}/sync`);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteICSSubscription: async (subscriptionId) => {
    try {
      await api.delete(`/ics/${subscriptionId}`);
      await get().fetchICSSubscriptions();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchICSEvents: async (subscriptionId) => {
    try {
      const response = await api.get<ICSEvent[]>(`/ics/${subscriptionId}/events`);
      set((state) => ({
        icsEvents: { ...state.icsEvents, [subscriptionId]: response.data },
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
