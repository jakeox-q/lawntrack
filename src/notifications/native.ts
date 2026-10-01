/**
 * Bridge between the planned reminders and the operating system.
 * The database is the source of truth; this module only makes the OS match it.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { diffNotifications, type DesiredNotification, ID_PREFIX } from '@/domain/notification-plan';

export const CATEGORY_ID = 'lawn-task';
export const ACTION_DONE = 'done';
export const ACTION_SNOOZE = 'snooze';
const CHANNEL_ID = 'reminders';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface PermissionInfo {
  state: PermissionState;
  canAskAgain: boolean;
}

export interface SyncResult {
  at: number;
  scheduled: number;
  cancelled: number;
  failed: number;
  total: number;
  next: DesiredNotification | null;
  blocked: boolean;
}

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let configured: Promise<void> | null = null;

export function configureNotifications(): Promise<void> {
  if (!supported) return Promise.resolve();
  configured ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Lawn reminders',
        description: 'Reminders for lawn jobs you have scheduled',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    // Both actions open the app so the change is saved and shown with an undo option,
    // even if the app had been closed.
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      { identifier: ACTION_DONE, buttonTitle: 'Mark done', options: { opensAppToForeground: true } },
      { identifier: ACTION_SNOOZE, buttonTitle: 'Remind me tomorrow', options: { opensAppToForeground: true } },
    ]);
  })().catch((e) => {
    configured = null;
    throw e;
  });
  return configured;
}

function toInfo(p: Notifications.NotificationPermissionsStatus): PermissionInfo {
  const provisional = p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (p.granted || provisional) return { state: 'granted', canAskAgain: p.canAskAgain };
  return { state: p.status === 'denied' ? 'denied' : 'undetermined', canAskAgain: p.canAskAgain };
}

export async function getPermission(): Promise<PermissionInfo> {
  if (!supported) return { state: 'denied', canAskAgain: false };
  return toInfo(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<PermissionInfo> {
  if (!supported) return { state: 'denied', canAskAgain: false };
  await configureNotifications();
  return toInfo(await Notifications.requestPermissionsAsync());
}

/** Make the OS schedule match `desired`. Safe to call repeatedly; recovers from stale or missing alerts. */
export async function syncNotifications(desired: DesiredNotification[]): Promise<SyncResult> {
  const base = { at: Date.now(), total: desired.length, next: desired[0] ?? null };
  if (!supported) return { ...base, scheduled: 0, cancelled: 0, failed: 0, blocked: true };
  await configureNotifications();
  const permission = await getPermission();
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const ids = existing.map((n) => n.identifier);

  if (permission.state !== 'granted') {
    // Nothing can be shown, so don't leave stale alerts to fire if permission returns.
    const ours = ids.filter((id) => id.startsWith(ID_PREFIX));
    await Promise.allSettled(ours.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    return { ...base, scheduled: 0, cancelled: ours.length, failed: 0, blocked: true };
  }

  const diff = diffNotifications(desired, ids);
  let failed = 0;
  for (const id of diff.cancel) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      failed++;
    }
  }
  for (const n of diff.schedule) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          data: { occurrenceId: n.occurrenceId },
          categoryIdentifier: CATEGORY_ID,
          sound: 'default',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: CHANNEL_ID },
      });
    } catch {
      failed++;
    }
  }
  return { ...base, scheduled: diff.schedule.length - failed, cancelled: diff.cancel.length, failed, blocked: false };
}

export async function sendTestNotification(seconds = 5): Promise<void> {
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: `test:${Date.now()}`,
    content: {
      title: 'Test reminder',
      body: 'Reminders are working. Your real reminders will look like this.',
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL_ID },
  });
}

export type NotificationResponse = Notifications.NotificationResponse;
export const DEFAULT_ACTION = Notifications.DEFAULT_ACTION_IDENTIFIER;

export function subscribeToResponses(handler: (r: NotificationResponse) => void): () => void {
  if (!supported) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      if (r) handler(r);
    })
    .catch(() => {});
  return () => sub.remove();
}

export function clearLastResponse() {
  if (supported) Notifications.clearLastNotificationResponseAsync().catch(() => {});
}
