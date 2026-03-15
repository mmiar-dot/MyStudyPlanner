import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
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
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Badge management
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
