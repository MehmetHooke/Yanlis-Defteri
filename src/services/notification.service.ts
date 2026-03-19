import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_ENABLED_KEY = "daily_reminder_enabled";
const REMINDER_HOUR_KEY = "daily_reminder_hour";
const REMINDER_MINUTE_KEY = "daily_reminder_minute";
const REMINDER_NOTIFICATION_ID_KEY = "daily_reminder_notification_id";

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId?: string | null;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("daily-reminders", {
    name: "Günlük Hatırlatmalar",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    sound: "default",
  });
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const [enabledRaw, hourRaw, minuteRaw, notificationId] = await Promise.all([
    AsyncStorage.getItem(REMINDER_ENABLED_KEY),
    AsyncStorage.getItem(REMINDER_HOUR_KEY),
    AsyncStorage.getItem(REMINDER_MINUTE_KEY),
    AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY),
  ]);

  return {
    enabled: enabledRaw === "true",
    hour: Number(hourRaw ?? "20"),
    minute: Number(minuteRaw ?? "0"),
    notificationId,
  };
}

export async function saveReminderSettings(settings: ReminderSettings) {
  await Promise.all([
    AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(settings.enabled)),
    AsyncStorage.setItem(REMINDER_HOUR_KEY, String(settings.hour)),
    AsyncStorage.setItem(REMINDER_MINUTE_KEY, String(settings.minute)),
    AsyncStorage.setItem(
      REMINDER_NOTIFICATION_ID_KEY,
      settings.notificationId ?? "",
    ),
  ]);
}

export async function requestNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();

  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelDailyReminder() {
  const settings = await getReminderSettings();

  if (settings.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        settings.notificationId,
      );
    } catch (e) {
      console.log("cancelScheduledNotificationAsync error:", e);
    }
  }

  await saveReminderSettings({
    ...settings,
    enabled: false,
    notificationId: null,
  });
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  await setupNotificationChannel();

  const settings = await getReminderSettings();

  if (settings.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        settings.notificationId,
      );
    } catch (e) {
      console.log("old notification cancel error:", e);
    }
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Yanlış Defteri",
      body: "Bugün kısa bir tekrar yap ve yanlışlarını gözden geçir.",
      sound: true,
    },
    trigger: Platform.select({
      android: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: "daily-reminders",
      },
      ios: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    }) as Notifications.NotificationTriggerInput,
  });

  await saveReminderSettings({
    enabled: true,
    hour,
    minute,
    notificationId: id,
  });

  return id;
}
