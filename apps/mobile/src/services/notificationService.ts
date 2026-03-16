import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lazy load expo-notifications only on native platforms
let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

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

// Singleton pattern for notification service (used by profile page)
class NotificationService {
  private settings = {
    dailyReminder: true,
    lateSessionAlerts: true,
    morningBrief: true,
  };
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;
    
    try {
      if (Platform.OS !== 'web') {
        await registerForPushNotifications();
      }
      
      // Load settings from storage
      const stored = await AsyncStorage.getItem('profile_notif_settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
      this.initialized = true;
    } catch (error) {
      console.log('Notification init error:', error);
    }
  }

  getSettings() {
    return this.settings;
  }

  async updateSettings(newSettings: typeof this.settings) {
    this.settings = newSettings;
    try {
      await AsyncStorage.setItem('profile_notif_settings', JSON.stringify(newSettings));
    } catch {}
  }

  async sendImmediateNotification(title: string, body: string) {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('Web notification:', title, body);
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Immediate
    });
  }
}

const notificationService = new NotificationService();
export default notificationService;
