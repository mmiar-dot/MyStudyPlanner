import { create } from 'zustand';
import api from '../services/api';
import { StudySession, RevisionMethod } from '../types';

interface SessionState {
  todaySessions: StudySession[];
  lateSessions: StudySession[];
  allSessions: StudySession[];
  isLoading: boolean;
  error: string | null;
  fetchTodaySessions: () => Promise<void>;
  fetchLateSessions: () => Promise<void>;
  fetchAllSessions: () => Promise<void>;
  fetchSessionsByDate: (date: string) => Promise<StudySession[]>;
  completeSession: (sessionId: string, srsRating?: number, notes?: string) => Promise<void>;
  skipSession: (sessionId: string) => Promise<void>;
  setSessionTime: (sessionId: string, time: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  todaySessions: [],
  lateSessions: [],
  allSessions: [],
  isLoading: false,
  error: null,

  fetchTodaySessions: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<StudySession[]>('/sessions/today');
      set({ todaySessions: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchLateSessions: async () => {
    try {
      const response = await api.get<StudySession[]>('/sessions/late');
      set({ lateSessions: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchAllSessions: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<StudySession[]>('/sessions');
      set({ allSessions: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchSessionsByDate: async (date: string) => {
    try {
      const response = await api.get<StudySession[]>(`/sessions?date=${date}`);
      return response.data;
    } catch (error: any) {
      return [];
    }
  },

  completeSession: async (sessionId: string, srsRating?: number, notes?: string) => {
    try {
      await api.post(`/sessions/${sessionId}/complete`, { srs_rating: srsRating, notes });
      // Refresh sessions
      await get().fetchTodaySessions();
      await get().fetchLateSessions();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  skipSession: async (sessionId: string) => {
    try {
      await api.post(`/sessions/${sessionId}/skip`);
      await get().fetchTodaySessions();
      await get().fetchLateSessions();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setSessionTime: async (sessionId: string, time: string) => {
    try {
      await api.put(`/sessions/${sessionId}/time`, null, { params: { time } });
      await get().fetchTodaySessions();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
