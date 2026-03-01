import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

  async init(): Promise<string | null> {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
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
        // In Expo Go, projectId might not be available
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        this.expoPushToken = tokenData.data;
      } catch (tokenError) {
        // Notifications might not work in Expo Go, but app should still function
        console.log('Push token not available (this is normal in Expo Go):', tokenError);
        this.expoPushToken = null;
      }

      // Configure notification channels for Android
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
    this.rescheduleNotifications();
  }

  getSettings(): NotificationSettings {
    return this.settings;
  }

  async rescheduleNotifications() {
    // Cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule daily reminder
    if (this.settings.dailyReminder) {
      await this.scheduleDailyReminder();
    }

    // Schedule morning brief
    if (this.settings.morningBrief) {
      await this.scheduleMorningBrief();
    }
  }

  private async scheduleDailyReminder() {
    const [hours, minutes] = this.settings.dailyReminderTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Révisions du jour',
        body: 'N\'oubliez pas vos sessions de révision !',
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
    const [hours, minutes] = this.settings.morningBriefTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Résumé matinal',
        body: 'Consultez votre planning de révision pour aujourd\'hui',
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
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // null means immediate
    });
  }

  async sendLateSessionAlert(sessionCount: number) {
    if (Platform.OS === 'web' || !this.settings.lateSessionAlerts) return;

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
    if (Platform.OS === 'web') return;

    const now = new Date();
    if (date <= now) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  }

  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
