import type { ActivityKind } from '@/domain/activity-types';
import type { RateUnit } from '@/domain/calculator';
import type { LocalDate, LocalTime } from '@/domain/dates';
import type { SeriesMode } from '@/domain/schedule';

export interface Area {
  id: string;
  name: string;
  sizeM2: number | null;
  grassType: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface Series {
  id: string;
  areaId: string | null;
  kind: ActivityKind;
  title: string;
  mode: SeriesMode;
  intervalDays: number | null;
  startDate: LocalDate;
  reminderTime: LocalTime;
  productName: string | null;
  rateValue: number | null;
  rateUnit: RateUnit | null;
  notes: string | null;
  paused: boolean;
}

export type OccurrenceStatus = 'pending' | 'done' | 'skipped';

export interface Occurrence {
  id: string;
  seriesId: string;
  dueDate: LocalDate;
  status: OccurrenceStatus;
  dueOverridden: boolean;
  snoozedUntil: string | null;
  previousOccurrenceId: string | null;
  activityId: string | null;
  resolvedAt: string | null;
}

export interface Activity {
  id: string;
  areaId: string | null;
  kind: ActivityKind;
  title: string | null;
  localDate: LocalDate;
  loggedAt: string;
  seriesId: string | null;
  occurrenceId: string | null;
  productName: string | null;
  quantityValue: number | null;
  quantityUnit: string | null;
  rateValue: number | null;
  rateUnit: RateUnit | null;
  rateSource: string | null;
  mowHeightMm: number | null;
  notes: string | null;
}

export interface Settings {
  timeZone: string | null;
  reminderTime: LocalTime;
  onboardingComplete: boolean;
  notificationsAsked: boolean;
}

export interface SeriesInput {
  areaId: string | null;
  kind: ActivityKind;
  title: string;
  mode: SeriesMode;
  intervalDays: number | null;
  startDate: LocalDate;
  reminderTime: LocalTime;
  productName?: string | null;
  rateValue?: number | null;
  rateUnit?: RateUnit | null;
  notes?: string | null;
}

export interface ActivityDetails {
  productName?: string | null;
  quantityValue?: number | null;
  quantityUnit?: string | null;
  rateValue?: number | null;
  rateUnit?: RateUnit | null;
  mowHeightMm?: number | null;
  notes?: string | null;
}

export interface ActivityInput extends ActivityDetails {
  areaId: string | null;
  kind: ActivityKind;
  title?: string | null;
  localDate: LocalDate;
}

/** A pending occurrence with everything a screen needs to show it. */
export interface TaskItem {
  occurrence: Occurrence;
  series: Series;
  area: Area | null;
  lastDone: LocalDate | null;
}

export interface Snapshot {
  today: LocalDate;
  timeZone: string;
  settings: Settings;
  areas: Area[];
  series: Series[];
  /** Pending occurrences of active, unpaused series, soonest first. */
  tasks: TaskItem[];
  activities: Activity[];
}
