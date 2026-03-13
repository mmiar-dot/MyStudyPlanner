import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Types sans import runtime (important)
type ExpoNotifications = typeof import('expo-notifications');
type ExpoNotification = import('expo-notifications').Notification;
type ExpoNotificationResponse = import('expo-notifications').NotificationResponse;

// Lazy import (n'importe jamais expo-notifications sur le web)
let _Notifications: ExpoNotifications | null = null;
async function getNotifications(): Promise<ExpoNotifications | null> {
  if (Platform.OS === 'web') return null;
  if (_Notifications) return _Notifications;
  _Notifications = await import('expo-notifications');
  return _Notifications;
}

export interface NotificationSettings {
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:mm format
  lateSessionAlerts: boolean;
  morningBrief: boolean;
  morningBriefTime: string; // HH:mm format
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminder: true,
  dailyReminderTime: '08:00',
  lateSessionAlerts: true,
  morningBrief: false,
  morningBriefTime: '08:00',
};

class NotificationService {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private expoPushToken: string | null = null;
  private handlerConfigured = false;

  async init(): Promise<string | null> {
    const Notifications = await getNotifications();
    if (!Notifications) {
      console.log('Notifications not supported on web');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Configure notification behavior (native only) - 1 seule fois
      if (!this.handlerConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
        this.handlerConfigured = true;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission for notifications not granted');
        return null;
      }

      // Get Expo push token
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        this.expoPushToken = tokenData.data;
      } catch (tokenError) {
        console.log('Push token not available (normal in some cases):', tokenError);
        this.expoPushToken = null;
      }

      // Android channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('study-reminders', {
          name: 'Rappels de révision',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });

        await Notifications.setNotificationChannelAsync('late-alerts', {
          name: 'Alertes de retard',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#EF4444',
        });
      }

      console.log('Notifications initialized with token:', this.expoPushToken);
      return this.expoPushToken;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return null;
    }
  }

  getToken(): string | null {
    return this.expoPushToken;
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    void this.rescheduleNotifications(); // important: ne pas oublier le void/await
  }

  getSettings(): NotificationSettings {
    return this.settings;
  }

  async rescheduleNotifications() {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    if (this.settings.dailyReminder) {
      await this.scheduleDailyReminder();
    }

    if (this.settings.morningBrief) {
      await this.scheduleMorningBrief();
    }
  }

  private async scheduleDailyReminder() {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const [hours, minutes] = this.settings.dailyReminderTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Révisions du jour',
        body: "N'oubliez pas vos sessions de révision !",
        data: { type: 'daily_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    console.log(`Daily reminder scheduled for ${hours}:${minutes}`);
  }

  private async scheduleMorningBrief() {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const [hours, minutes] = this.settings.morningBriefTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Résumé matinal',
        body: "Consultez votre planning de révision pour aujourd'hui",
        data: { type: 'morning_brief' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    console.log(`Morning brief scheduled for ${hours}:${minutes}`);
  }

  async sendImmediateNotification(title: string, body: string, data?: Record<string, any>) {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: true },
      trigger: null,
    });
  }

  async sendLateSessionAlert(sessionCount: number) {
    const Notifications = await getNotifications();
    if (!Notifications || !this.settings.lateSessionAlerts) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sessions en retard',
        body: `Vous avez ${sessionCount} session(s) de révision en retard.`,
        data: { type: 'late_alert', count: sessionCount },
        sound: true,
        categoryIdentifier: 'late-alerts',
      },
      trigger: null,
    });
  }

  async scheduleSingleReminder(date: Date, title: string, body: string, data?: Record<string, any>) {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const now = new Date();
    if (date <= now) return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  }

  async addNotificationReceivedListener(callback: (notification: ExpoNotification) => void) {
    const Notifications = await getNotifications();
    if (!Notifications) return null;
    return Notifications.addNotificationReceivedListener(callback);
  }

  async addNotificationResponseReceivedListener(callback: (response: ExpoNotificationResponse) => void) {
    const Notifications = await getNotifications();
    if (!Notifications) return null;
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
export default notificationService;