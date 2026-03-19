import { create } from 'zustand';
import api from '../api';
import { ProgressStats, CalendarDayData } from '../types';

interface AnalyticsState {
  progress: ProgressStats | null;
  calendarData: Record<string, CalendarDayData>;
  isLoading: boolean;
  error: string | null;
  fetchProgress: () => Promise<void>;
  fetchCalendarData: (month: number, year: number) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  progress: null,
  calendarData: {},
  isLoading: false,
  error: null,

  fetchProgress: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<ProgressStats>('/analytics/progress');
      set({ progress: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchCalendarData: async (month: number, year: number) => {
    try {
      const response = await api.get<Record<string, CalendarDayData>>(
        `/analytics/calendar?month=${month}&year=${year}`
      );
      set({ calendarData: response.data || {} });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
