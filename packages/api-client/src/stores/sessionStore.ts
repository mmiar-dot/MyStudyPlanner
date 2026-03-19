import { create } from 'zustand';
import api from '../api';
import { StudySession, RevisionMethod } from '../types';

interface CourseNote {
  id: string;
  user_id: string;
  item_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

interface SessionState {
  todaySessions: StudySession[];
  lateSessions: StudySession[];
  allSessions: StudySession[];
  courseNotes: Record<string, CourseNote[]>;
  isLoading: boolean;
  error: string | null;
  fetchTodaySessions: () => Promise<void>;
  fetchLateSessions: () => Promise<void>;
  fetchAllSessions: () => Promise<void>;
  fetchSessionsByDate: (date: string) => Promise<StudySession[]>;
  completeSession: (sessionId: string, srsRating?: number, notes?: string) => Promise<void>;
  uncompleteSession: (sessionId: string) => Promise<void>;
  skipSession: (sessionId: string) => Promise<void>;
  rescheduleSession: (sessionId: string, newDate: string) => Promise<void>;
  setSessionTime: (sessionId: string, time: string) => Promise<void>;
  fetchCourseNotes: (itemId: string) => Promise<void>;
  addCourseNote: (itemId: string, content: string) => Promise<void>;
  updateCourseNote: (itemId: string, noteId: string, content: string) => Promise<void>;
  deleteCourseNote: (itemId: string, noteId: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  todaySessions: [],
  lateSessions: [],
  allSessions: [],
  courseNotes: {},
  isLoading: false,
  error: null,

  fetchTodaySessions: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<StudySession[]>('/sessions/today');
      const data = Array.isArray(response.data) ? response.data : [];
      set({ todaySessions: data, isLoading: false });
    } catch (error: any) {
      set({ todaySessions: [], error: error.message, isLoading: false });
    }
  },

  fetchLateSessions: async () => {
    try {
      const response = await api.get<StudySession[]>('/sessions/late');
      const data = Array.isArray(response.data) ? response.data : [];
      set({ lateSessions: data });
    } catch (error: any) {
      set({ lateSessions: [], error: error.message });
    }
  },

  fetchAllSessions: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<StudySession[]>('/sessions');
      const data = Array.isArray(response.data) ? response.data : [];
      set({ allSessions: data, isLoading: false });
    } catch (error: any) {
      set({ allSessions: [], error: error.message, isLoading: false });
    }
  },

  fetchSessionsByDate: async (date: string) => {
    try {
      const response = await api.get<StudySession[]>(`/sessions?date=${date}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      return [];
    }
  },

  completeSession: async (sessionId: string, srsRating?: number, notes?: string) => {
    try {
      await api.post(`/sessions/${sessionId}/complete`, { srs_rating: srsRating, notes });
      await get().fetchTodaySessions();
      await get().fetchLateSessions();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  uncompleteSession: async (sessionId: string) => {
    try {
      await api.post(`/sessions/${sessionId}/uncomplete`);
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

  rescheduleSession: async (sessionId: string, newDate: string) => {
    try {
      await api.put(`/sessions/${sessionId}/reschedule`, { new_date: newDate });
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

  fetchCourseNotes: async (itemId: string) => {
    try {
      const response = await api.get<CourseNote[]>(`/courses/${itemId}/notes`);
      set((state) => ({
        courseNotes: { ...state.courseNotes, [itemId]: response.data || [] }
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addCourseNote: async (itemId: string, content: string) => {
    try {
      await api.post(`/courses/${itemId}/notes`, { content });
      await get().fetchCourseNotes(itemId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateCourseNote: async (itemId: string, noteId: string, content: string) => {
    try {
      await api.put(`/courses/${itemId}/notes/${noteId}`, { content });
      await get().fetchCourseNotes(itemId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteCourseNote: async (itemId: string, noteId: string) => {
    try {
      await api.delete(`/courses/${itemId}/notes/${noteId}`);
      await get().fetchCourseNotes(itemId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
