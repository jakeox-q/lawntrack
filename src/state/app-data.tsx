import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { getCalendars } from 'expo-localization';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { createRepo, type Repo, RepoError } from '@/data/repo';
import type { ActivityDetails, Snapshot } from '@/data/types';
import type { LocalDate } from '@/domain/dates';
import { formatDate } from '@/domain/format';
import { planNotifications } from '@/domain/notification-plan';
import { snoozeChoices } from '@/domain/snooze';
import {
  ACTION_DONE,
  ACTION_SNOOZE,
  clearLastResponse,
  configureNotifications,
  getPermission,
  type NotificationResponse,
  type PermissionInfo,
  requestPermission as askPermission,
  subscribeToResponses,
  type SyncResult,
  syncNotifications,
} from '@/notifications/native';

export function deviceTimeZone(): string {
  try {
    return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Australia/Sydney';
  } catch {
    return 'Australia/Sydney';
  }
}

export interface ToastState {
  id: number;
  message: string;
  undo?: () => Promise<void>;
}

interface AppData {
  snapshot: Snapshot | null;
  error: Error | null;
  repo: Repo;
  refresh(): Promise<void>;
  /** Run a mutation, refresh, and surface validation errors. Returns undefined on failure. */
  act<T>(fn: (repo: Repo) => Promise<T>): Promise<T | undefined>;
  /** Like `act` for mutations with no result: resolves true only if the change was saved. */
  run(fn: (repo: Repo) => Promise<unknown>): Promise<boolean>;
  completeTask(occurrenceId: string, date?: LocalDate, details?: ActivityDetails): Promise<boolean>;
  snoozeTask(occurrenceId: string, until: Date, label: string): Promise<void>;
  toast: ToastState | null;
  showToast(message: string, undo?: () => Promise<void>): void;
  hideToast(): void;
  permission: PermissionInfo | null;
  requestPermission(): Promise<PermissionInfo>;
  refreshPermission(): Promise<void>;
  lastSync: SyncResult | null;
  deviceZone: string;
}

const Ctx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used inside AppDataProvider');
  return v;
}

export function useSnapshot(): Snapshot {
  const { snapshot } = useAppData();
  if (!snapshot) throw new Error('Snapshot not loaded');
  return snapshot;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const deviceZone = useMemo(() => deviceTimeZone(), []);
  const repo = useMemo(
    () => createRepo(db, { newId: () => Crypto.randomUUID(), now: () => new Date(), deviceTimeZone: () => deviceZone }),
    [db, deviceZone],
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [permission, setPermission] = useState<PermissionInfo | null>(null);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const syncing = useRef<Promise<void>>(Promise.resolve());

  const sync = useCallback((s: Snapshot) => {
    // Serialise reconciliations so two quick changes can't interleave OS calls.
    syncing.current = syncing.current.then(async () => {
      try {
        const desired = planNotifications(
          s.tasks.map((t) => ({
            occurrenceId: t.occurrence.id,
            title: t.series.title,
            areaName: t.area?.name ?? null,
            dueDate: t.occurrence.dueDate,
            reminderTime: t.series.reminderTime,
            snoozedUntil: t.occurrence.snoozedUntil,
          })),
          s.timeZone,
          Date.now(),
        );
        setLastSync(await syncNotifications(desired));
      } catch (e) {
        console.warn('Notification sync failed', e);
      }
    });
    return syncing.current;
  }, []);

  const applySnapshot = useCallback(
    (s: Snapshot) => {
      snapshotRef.current = s;
      setSnapshot(s);
      setError(null);
      if (s.settings.onboardingComplete) void sync(s);
    },
    [sync],
  );
  const applyError = useCallback((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))), []);

  const refresh = useCallback(() => repo.loadSnapshot().then(applySnapshot, applyError), [repo, applySnapshot, applyError]);

  const refreshPermission = useCallback(async () => {
    try {
      setPermission(await getPermission());
    } catch {
      setPermission({ state: 'undetermined', canAskAgain: true });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const p = await askPermission().catch(() => ({ state: 'denied' as const, canAskAgain: false }));
    setPermission(p);
    await repo.markNotificationsAsked();
    await refresh();
    return p;
  }, [repo, refresh]);

  const showToast = useCallback((message: string, undo?: () => Promise<void>) => {
    setToast({ id: Date.now(), message, undo });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);

  const act = useCallback(
    async <T,>(fn: (r: Repo) => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn(repo);
        await refresh();
        return result;
      } catch (e) {
        if (e instanceof RepoError) {
          Alert.alert('Check this', e.message);
        } else {
          console.error(e);
          Alert.alert('Something went wrong', 'Your change was not saved. Please try again.');
        }
        await refresh();
        return undefined;
      }
    },
    [repo, refresh],
  );

  const run = useCallback(
    async (fn: (r: Repo) => Promise<unknown>) => {
      let saved = false;
      await act(async (r) => {
        await fn(r);
        saved = true;
      });
      return saved;
    },
    [act],
  );

  const completeTask = useCallback(
    async (occurrenceId: string, date?: LocalDate, details?: ActivityDetails) => {
      const today = snapshotRef.current?.today;
      const result = await act((r) => r.completeOccurrence(occurrenceId, date ?? today!, details));
      if (!result) return false;
      if (result.alreadyResolved) {
        showToast('Already done');
        return true;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const next = result.successorDue ? ` · next ${formatDate(result.successorDue, today)}` : '';
      showToast(`Done${next}`, async () => {
        const ok = await act((r) => r.reopenOccurrence(occurrenceId));
        if (ok === false) Alert.alert('Can’t undo', 'The next reminder has already been changed. Edit the entry in History instead.');
      });
      return true;
    },
    [act, showToast],
  );

  const snoozeTask = useCallback(
    async (occurrenceId: string, until: Date, label: string) => {
      if (await run((r) => r.snoozeOccurrence(occurrenceId, until))) showToast(`Reminder moved to ${label.toLowerCase()}`);
    },
    [run, showToast],
  );

  // First load, and reload whenever the app returns to the foreground (date rollover,
  // permission changes in system settings, recovering alerts the OS dropped).
  useEffect(() => {
    void configureNotifications().catch(() => {});
    const reload = () => {
      repo.loadSnapshot().then(applySnapshot, applyError);
      getPermission().then(setPermission, () => setPermission({ state: 'undetermined', canAskAgain: true }));
    };
    reload();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => sub.remove();
  }, [repo, applySnapshot, applyError]);

  // Notification taps and action buttons.
  const ready = !!snapshot?.settings.onboardingComplete;
  const handled = useRef(new Set<string>());
  useEffect(() => {
    if (!ready) return;
    const handle = async (response: NotificationResponse) => {
      const key = `${response.notification.request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      clearLastResponse();
      const occurrenceId = response.notification.request.content.data?.occurrenceId;
      if (typeof occurrenceId !== 'string') return;
      const s = snapshotRef.current;
      const task = s?.tasks.find((t) => t.occurrence.id === occurrenceId);
      if (response.actionIdentifier === ACTION_DONE) {
        await completeTask(occurrenceId);
        router.navigate('/');
      } else if (response.actionIdentifier === ACTION_SNOOZE) {
        if (!task || !s) return;
        const tomorrow = snoozeChoices(new Date(), s.timeZone, task.series.reminderTime)[1];
        await snoozeTask(occurrenceId, tomorrow.until, 'tomorrow');
        router.navigate('/');
      } else if (task) {
        router.push({ pathname: '/task/[id]', params: { id: occurrenceId } });
      } else {
        router.navigate('/');
      }
    };
    return subscribeToResponses((r) => void handle(r));
  }, [ready, completeTask, snoozeTask]);

  const value = useMemo<AppData>(
    () => ({
      snapshot,
      error,
      repo,
      refresh,
      act,
      run,
      completeTask,
      snoozeTask,
      toast,
      showToast,
      hideToast,
      permission,
      requestPermission,
      refreshPermission,
      lastSync,
      deviceZone,
    }),
    [snapshot, error, repo, refresh, act, run, completeTask, snoozeTask, toast, showToast, hideToast, permission, requestPermission, refreshPermission, lastSync, deviceZone],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
