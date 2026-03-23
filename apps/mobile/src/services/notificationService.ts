import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lazy load expo-notifications only on native platforms
let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const NOTIFICATION_PREFS_KEY = 'notification_preferences_v2';

export interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:mm format
  sessionReminders: boolean;
  sessionReminderMinutes: number; // minutes before session
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyReminder: true,
  dailyReminderTime: '08:00',
  sessionReminders: true,
  sessionReminderMinutes: 30,
};

// Configure notification handler - only on native platforms
if (Platform.OS !== 'web' && Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) {
    console.log('Notifications not supported on web');
    return null;
  }
  
  try {
    // Check if we have permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Get push token for Expo notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Rappels',
        description: 'Rappels de révision',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
      
      await Notifications.setNotificationChannelAsync('late-sessions', {
        name: 'Sessions en retard',
        description: 'Alertes pour les sessions en retard',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    return token.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  
  // Reschedule notifications based on new settings
  await cancelAllNotifications();
  
  if (settings.enabled && settings.dailyReminder) {
    await scheduleDailyReminder(settings.dailyReminderTime);
  }
}

export async function scheduleDailyReminder(time: string): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  
  const [hours, minutes] = time.split(':').map(Number);
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'MyStudyPlanner',
      body: "C'est l'heure de réviser ! Consultez vos sessions du jour.",
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
  });
}

export async function scheduleSessionReminder(
  sessionId: string,
  sessionTitle: string,
  scheduledDate: Date,
  minutesBefore: number
): Promise<string> {
  if (Platform.OS === 'web' || !Notifications) return '';
  
  const triggerDate = new Date(scheduledDate.getTime() - minutesBefore * 60 * 1000);
  
  // Only schedule if in the future
  if (triggerDate <= new Date()) {
    return '';
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Session de révision',
      body: `"${sessionTitle}" commence dans ${minutesBefore} minutes`,
      data: { type: 'session_reminder', sessionId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

export async function cancelNotification(id: string): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications() {
  if (Platform.OS === 'web' || !Notifications) return [];
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Badge management
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.setBadgeCountAsync(0);
}

// =====================================
// Enhanced NotificationService class
// =====================================

export interface SessionData {
  id: string;
  title: string;
  method?: string;
  scheduled_date?: string;
}

class NotificationService {
  private initialized: boolean = false;
  private permissionGranted: boolean = false;

  async init(): Promise<boolean> {
    if (this.initialized) return this.permissionGranted;
    
    try {
      if (Platform.OS !== 'web') {
        const token = await registerForPushNotifications();
        this.permissionGranted = token !== null;
      } else {
        this.permissionGranted = false;
      }
      this.initialized = true;
      return this.permissionGranted;
    } catch (error) {
      console.log('Notification init error:', error);
      this.initialized = true;
      this.permissionGranted = false;
      return false;
    }
  }

  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  async sendImmediateNotification(title: string, body: string, data?: Record<string, any>) {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('Web notification:', title, body);
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // Immediate
    });
  }

  /**
   * Schedule the daily sessions notification
   */
  async scheduleDailySummary(
    hour: number,
    minute: number,
    enabled: boolean
  ): Promise<void> {
    if (Platform.OS === 'web' || !Notifications) return;
    
    // Cancel existing daily notifications first
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'daily_sessions') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
    
    if (!enabled) return;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Vos révisions du jour',
        body: 'Consultez vos sessions de révision pour aujourd\'hui !',
        data: { type: 'daily_sessions' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    
    console.log(`Daily sessions notification scheduled at ${hour}:${minute}`);
  }

  /**
   * Schedule the late sessions notification (runs daily at same time as daily summary)
   */
  async scheduleLateSessionsReminder(
    hour: number,
    minute: number,
    enabled: boolean
  ): Promise<void> {
    if (Platform.OS === 'web' || !Notifications) return;
    
    // Cancel existing late notifications first
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'late_sessions') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
    
    if (!enabled) return;
    
    // Schedule a few minutes after the daily summary
    const lateMinute = (minute + 5) % 60;
    const lateHour = minute + 5 >= 60 ? (hour + 1) % 24 : hour;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Sessions en retard',
        body: 'Vous avez des sessions de révision en retard à rattraper !',
        data: { type: 'late_sessions' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: lateHour,
        minute: lateMinute,
      },
    });
    
    console.log(`Late sessions notification scheduled at ${lateHour}:${lateMinute}`);
  }

  /**
   * Reschedule all notifications based on current preferences
   */
  async rescheduleAllNotifications(
    dailyEnabled: boolean,
    lateEnabled: boolean,
    hour: number,
    minute: number
  ): Promise<void> {
    await this.scheduleDailySummary(hour, minute, dailyEnabled);
    await this.scheduleLateSessionsReminder(hour, minute, lateEnabled);
  }

  /**
   * Send an immediate notification about today's sessions
   */
  async notifyTodaySessions(sessions: SessionData[]): Promise<void> {
    if (Platform.OS === 'web' || !Notifications || sessions.length === 0) return;
    
    const count = sessions.length;
    const title = `📚 ${count} session${count > 1 ? 's' : ''} aujourd'hui`;
    const body = count === 1 
      ? sessions[0].title 
      : `${sessions.slice(0, 3).map(s => s.title).join(', ')}${count > 3 ? ` et ${count - 3} autre(s)` : ''}`;
    
    await this.sendImmediateNotification(title, body, { 
      type: 'today_sessions_summary',
      count 
    });
  }

  /**
   * Send an immediate notification about late sessions
   */
  async notifyLateSessions(sessions: SessionData[]): Promise<void> {
    if (Platform.OS === 'web' || !Notifications || sessions.length === 0) return;
    
    const count = sessions.length;
    const title = `⚠️ ${count} session${count > 1 ? 's' : ''} en retard`;
    const body = count === 1 
      ? `"${sessions[0].title}" doit être révisé` 
      : `${sessions.slice(0, 3).map(s => s.title).join(', ')}${count > 3 ? ` et ${count - 3} autre(s)` : ''}`;
    
    await this.sendImmediateNotification(title, body, { 
      type: 'late_sessions_summary',
      count 
    });
  }

  // Legacy method for backward compatibility with profile.tsx
  getSettings() {
    return {
      dailyReminder: true,
      lateSessionAlerts: true,
      morningBrief: true,
    };
  }

  async updateSettings(newSettings: { dailyReminder: boolean; lateSessionAlerts: boolean; morningBrief: boolean }) {
    // Legacy method - preferences are now managed by notificationStore
    try {
      await AsyncStorage.setItem('profile_notif_settings', JSON.stringify(newSettings));
    } catch {}
  }
}

const notificationService = new NotificationService();
export default notificationService;
