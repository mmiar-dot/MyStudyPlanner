import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@mystudyplanner/api-client';

const CALENDAR_SYNC_KEY = 'calendar_sync_config';
const APP_CALENDAR_NAME = 'MyStudyPlanner';

export interface CalendarSyncConfig {
  enabled: boolean;
  selectedCalendarId: string | null;
  syncDirection: 'import' | 'export' | 'both';
  lastSyncDate: string | null;
  autoSync: boolean;
}

export interface DeviceCalendar {
  id: string;
  title: string;
  color: string;
  source: string;
  type: string;
  allowsModifications: boolean;
  isPrimary: boolean;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  allDay?: boolean;
  calendarId?: string;
}

class CalendarSyncService {
  private config: CalendarSyncConfig = {
    enabled: false,
    selectedCalendarId: null,
    syncDirection: 'both',
    lastSyncDate: null,
    autoSync: false,
  };
  private appCalendarId: string | null = null;

  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig() {
    try {
      // Skip on server-side rendering
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      const stored = await AsyncStorage.getItem(CALENDAR_SYNC_KEY);
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading calendar config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfig() {
    try {
      await AsyncStorage.setItem(CALENDAR_SYNC_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving calendar config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CalendarSyncConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<CalendarSyncConfig>) {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }

  /**
   * Check if calendar API is available
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false; // expo-calendar is not available on web
    }
    return await Calendar.isAvailableAsync();
  }

  /**
   * Request calendar permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  /**
   * Get permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    if (Platform.OS === 'web') {
      return 'denied';
    }

    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      return status as 'granted' | 'denied' | 'undetermined';
    } catch {
      return 'denied';
    }
  }

  /**
   * Get all device calendars
   */
  async getDeviceCalendars(): Promise<DeviceCalendar[]> {
    if (Platform.OS === 'web') {
      return [];
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return [];
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      return calendars.map((cal) => ({
        id: cal.id,
        title: cal.title,
        color: cal.color || '#3B82F6',
        source: cal.source?.name || 'Local',
        type: cal.type || 'unknown',
        allowsModifications: cal.allowsModifications || false,
        isPrimary: cal.isPrimary || false,
      }));
    } catch (error) {
      console.error('Error getting calendars:', error);
      return [];
    }
  }

  /**
   * Create or get the app's dedicated calendar
   */
  async getOrCreateAppCalendar(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Check if we already have the calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const existingCalendar = calendars.find((cal) => cal.title === APP_CALENDAR_NAME);
      
      if (existingCalendar) {
        this.appCalendarId = existingCalendar.id;
        return existingCalendar.id;
      }

      // Create a new calendar
      const defaultSource = Platform.OS === 'ios'
        ? await Calendar.getDefaultCalendarSource()
        : { isLocalAccount: true, name: APP_CALENDAR_NAME, type: Calendar.SourceType.LOCAL };

      const newCalendarId = await Calendar.createCalendarAsync({
        title: APP_CALENDAR_NAME,
        color: '#3B82F6',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultSource.id,
        source: defaultSource,
        name: APP_CALENDAR_NAME,
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      this.appCalendarId = newCalendarId;
      return newCalendarId;
    } catch (error) {
      console.error('Error creating app calendar:', error);
      return null;
    }
  }

  /**
   * Export study sessions to device calendar
   */
  async exportSessionsToCalendar(sessions: any[]): Promise<{ success: number; failed: number }> {
    if (Platform.OS === 'web') {
      return { success: 0, failed: 0 };
    }

    const calendarId = this.config.selectedCalendarId || await this.getOrCreateAppCalendar();
    if (!calendarId) {
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        const startDate = new Date(session.scheduled_date);
        startDate.setHours(9, 0, 0, 0); // Default to 9 AM

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 30); // 30 min duration

        await Calendar.createEventAsync(calendarId, {
          title: `📚 ${session.item_title}`,
          startDate,
          endDate,
          notes: `Session de révision - ${session.course_name || 'Cours'}\nMéthode: ${session.method || 'Non définie'}`,
          alarms: [{ relativeOffset: -30 }], // 30 min reminder
        });
        success++;
      } catch (error) {
        console.error('Error creating event:', error);
        failed++;
      }
    }

    // Update last sync date
    await this.updateConfig({ lastSyncDate: new Date().toISOString() });

    return { success, failed };
  }

  /**
   * Import events from device calendar
   */
  async importEventsFromCalendar(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    if (Platform.OS === 'web') {
      return [];
    }

    const calendarId = this.config.selectedCalendarId;
    if (!calendarId) {
      return [];
    }

    try {
      const events = await Calendar.getEventsAsync(
        [calendarId],
        startDate,
        endDate
      );

      return events.map((event) => ({
        id: event.id,
        title: event.title,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        notes: event.notes,
        location: event.location,
        allDay: event.allDay,
        calendarId: event.calendarId,
      }));
    } catch (error) {
      console.error('Error importing events:', error);
      return [];
    }
  }

  /**
   * Create an event in the device calendar using the native dialog
   */
  async createEventWithDialog(event: Omit<CalendarEvent, 'id'>): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const result = await Calendar.createEventInCalendarAsync({
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: event.notes,
        location: event.location,
      });

      if (result.action === Calendar.DialogEventResult.SAVED) {
        return result.id || null;
      }
      return null;
    } catch (error) {
      console.error('Error creating event with dialog:', error);
      return null;
    }
  }

  /**
   * Delete all app events from calendar
   */
  async clearAppCalendar(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const calendarId = this.appCalendarId;
      if (!calendarId) {
        return false;
      }

      const now = new Date();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const events = await Calendar.getEventsAsync([calendarId], now, futureDate);
      
      for (const event of events) {
        await Calendar.deleteEventAsync(event.id);
      }

      return true;
    } catch (error) {
      console.error('Error clearing calendar:', error);
      return false;
    }
  }

  /**
   * Sync all pending sessions to calendar
   */
  async syncPendingSessions(): Promise<{ success: number; failed: number }> {
    if (!this.config.enabled || Platform.OS === 'web') {
      return { success: 0, failed: 0 };
    }

    try {
      // Fetch pending sessions from API
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/sessions?from=${today}`);
      const sessions = response.data.filter(
        (s: any) => s.status === 'pending' || s.status === 'late'
      );

      return await this.exportSessionsToCalendar(sessions);
    } catch (error) {
      console.error('Error syncing sessions:', error);
      return { success: 0, failed: 0 };
    }
  }
}

const calendarSyncService = new CalendarSyncService();
export default calendarSyncService;
