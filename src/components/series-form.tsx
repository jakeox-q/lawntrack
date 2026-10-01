import { type ReactNode, useState } from 'react';
import { View } from 'react-native';

import { DateChoice, TimeChoice } from '@/components/choices';
import { Button, ChipGroup, Field, FieldLabel, parseNumber, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import type { Area, SeriesInput } from '@/data/types';
import { ACTIVITY_TYPES, type ActivityKind, activityType } from '@/domain/activity-types';
import { RATE_UNITS, type RateUnit } from '@/domain/calculator';
import type { LocalDate, LocalTime } from '@/domain/dates';
import { intervalLabel, type SeriesMode } from '@/domain/schedule';

const MODES: { value: SeriesMode; label: string; help: string }[] = [
  { value: 'after_completion', label: 'After I do it', help: 'The next reminder counts from the day you actually do it.' },
  { value: 'fixed', label: 'Set dates', help: 'Repeats on a fixed rhythm, even if you do it early or late.' },
  { value: 'once', label: 'Just once', help: 'A single reminder, like equipment hire or a lawn renovation day.' },
];

const INTERVALS = [7, 14, 21, 28, 42, 56, 84];
const CUSTOM = -1;

export function SeriesForm({
  initial,
  areas,
  today,
  defaultReminderTime,
  submitLabel,
  onSubmit,
  footer,
  kinds,
}: {
  initial?: Partial<SeriesInput>;
  areas: Area[];
  today: LocalDate;
  defaultReminderTime: LocalTime;
  submitLabel: string;
  onSubmit: (input: SeriesInput) => Promise<void>;
  footer?: ReactNode;
  kinds?: ActivityKind[];
}) {
  const [kind, setKind] = useState<ActivityKind>(initial?.kind ?? 'mow');
  const [title, setTitle] = useState(initial?.title ?? activityType(initial?.kind ?? 'mow').label);
  const [titleEdited, setTitleEdited] = useState(!!initial?.title);
  const [areaId, setAreaId] = useState<string | null>(initial?.areaId !== undefined ? initial.areaId : (areas[0]?.id ?? null));
  const [mode, setMode] = useState<SeriesMode>(initial?.mode ?? 'after_completion');
  const initialInterval = initial?.intervalDays ?? 14;
  const [interval, setInterval] = useState<number>(INTERVALS.includes(initialInterval) ? initialInterval : CUSTOM);
  const [customDays, setCustomDays] = useState(INTERVALS.includes(initialInterval) ? '' : String(initialInterval));
  const [startDate, setStartDate] = useState<LocalDate>(initial?.startDate ?? today);
  const [reminderTime, setReminderTime] = useState<LocalTime>(initial?.reminderTime ?? defaultReminderTime);
  const [productName, setProductName] = useState(initial?.productName ?? '');
  const [rate, setRate] = useState(initial?.rateValue != null ? String(initial.rateValue) : '');
  const [rateUnit, setRateUnit] = useState<RateUnit | null>(initial?.rateUnit ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = activityType(kind);
  const kindOptions = ACTIVITY_TYPES.filter((t) => !kinds || kinds.includes(t.kind)).map((t) => ({
    value: t.kind,
    label: t.label,
    icon: t.icon,
  }));
  const areaOptions = [
    ...areas.map((a) => ({ value: a.id as string | null, label: a.name })),
    ...(areas.length > 1 ? [{ value: null as string | null, label: 'All areas' }] : []),
  ];

  const submit = async () => {
    setError(null);
    const days = interval === CUSTOM ? parseNumber(customDays) : interval;
    const rateValue = type.usesProduct ? parseNumber(rate) : null;
    if (mode !== 'once' && (days == null || !Number.isInteger(days) || days < 1)) {
      return setError('Enter how many days between reminders.');
    }
    if (rateValue !== null && (Number.isNaN(rateValue) || rateValue <= 0)) return setError('Enter the label rate as a number, or leave it blank.');
    if (rateValue !== null && !rateUnit) return setError('Choose the rate unit from your label.');
    setBusy(true);
    try {
      await onSubmit({
        areaId,
        kind,
        title: title.trim() || type.label,
        mode,
        intervalDays: mode === 'once' ? null : days,
        startDate,
        reminderTime,
        productName: type.usesProduct ? productName : null,
        rateValue,
        rateUnit: rateValue !== null ? rateUnit : null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.sm }}>
        <FieldLabel label="What job?" />
        <ChipGroup
          label="Type of job"
          options={kindOptions}
          value={kind}
          onChange={(k) => {
            setKind(k);
            if (!titleEdited) setTitle(activityType(k).label);
          }}
        />
      </View>

      <Field
        label="Name"
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          setTitleEdited(true);
        }}
        returnKeyType="done"
        maxLength={60}
      />

      {areaOptions.length > 1 ? (
        <View style={{ gap: space.sm }}>
          <FieldLabel label="Where?" />
          <ChipGroup label="Lawn area" options={areaOptions} value={areaId} onChange={setAreaId} />
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <FieldLabel label="Repeat" hint={MODES.find((m) => m.value === mode)!.help} />
        <ChipGroup label="Repeat" options={MODES} value={mode} onChange={setMode} />
      </View>

      {mode !== 'once' ? (
        <View style={{ gap: space.sm }}>
          <FieldLabel
            label="How often?"
            hint={
              type.group === 'product'
                ? 'Use the interval on your product label or program. The app does not suggest one.'
                : 'Pick what suits your lawn. You can change it any time.'
            }
          />
          <ChipGroup
            label="How often"
            options={[...INTERVALS.map((d) => ({ value: d, label: intervalLabel(d).replace('every ', '') })), { value: CUSTOM, label: 'Custom' }]}
            value={interval}
            onChange={setInterval}
          />
          {interval === CUSTOM ? (
            <Field label="Days between" value={customDays} onChangeText={setCustomDays} keyboardType="number-pad" suffix="days" />
          ) : null}
        </View>
      ) : null}

      <DateChoice
        label={mode === 'once' ? 'When?' : 'First reminder'}
        value={startDate}
        onChange={setStartDate}
        today={today}
        direction="future"
      />

      <TimeChoice label="Reminder time" value={reminderTime} onChange={setReminderTime} />

      {type.usesProduct ? (
        <View style={{ gap: space.lg }}>
          <Field
            label="Product"
            optional
            placeholder="Name as it appears on the pack"
            value={productName}
            onChangeText={setProductName}
            maxLength={80}
          />
          <Field
            label="Label rate"
            optional
            hint="Copy this from your product label. It is only used for your calculations."
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder="e.g. 25"
          />
          {rate.trim() ? <ChipGroup label="Rate unit" options={RATE_UNITS.map((u) => ({ value: u.unit, label: u.label }))} value={rateUnit ?? undefined} onChange={setRateUnit} /> : null}
        </View>
      ) : null}

      {error ? (
        <Text color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={submitLabel} onPress={submit} busy={busy} />
      {footer}
    </View>
  );
}
