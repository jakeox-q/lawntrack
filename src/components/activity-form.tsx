import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { DateChoice } from '@/components/choices';
import { Button, Card, ChipGroup, Field, FieldLabel, Icon, parseNumber, Row, Text } from '@/components/ui';
import { space, TOUCH } from '@/constants/theme';
import type { ActivityInput, Area, TaskItem } from '@/data/types';
import { ACTIVITY_TYPES, type ActivityKind, activityType } from '@/domain/activity-types';
import { RATE_UNITS, type RateUnit } from '@/domain/calculator';
import { diffDays, type LocalDate } from '@/domain/dates';
import { relativeDue } from '@/domain/format';
import { useTheme } from '@/hooks/use-theme';

const QTY_UNITS = ['g', 'kg', 'mL', 'L'] as const;

/** Tasks this entry could count toward: same job, same (or any) area. */
export function matchingTasks(tasks: TaskItem[], kind: ActivityKind, areaId: string | null): TaskItem[] {
  return tasks.filter((t) => t.series.kind === kind && (t.series.areaId === areaId || t.series.areaId === null || areaId === null));
}

export function ActivityForm({
  initial,
  areas,
  tasks,
  today,
  lockedKind,
  submitLabel,
  onSubmit,
}: {
  initial: Partial<ActivityInput>;
  areas: Area[];
  /** Open tasks this entry may be linked to. Empty when editing. */
  tasks: TaskItem[];
  today: LocalDate;
  lockedKind?: boolean;
  submitLabel: string;
  onSubmit: (input: ActivityInput, linkOccurrenceId: string | null) => Promise<void>;
}) {
  const theme = useTheme();
  const [kind, setKind] = useState<ActivityKind>(initial.kind ?? 'mow');
  const [areaId, setAreaId] = useState<string | null>(initial.areaId !== undefined ? initial.areaId : (areas[0]?.id ?? null));
  const [localDate, setLocalDate] = useState<LocalDate>(initial.localDate ?? today);
  const [productName, setProductName] = useState(initial.productName ?? '');
  const [qty, setQty] = useState(initial.quantityValue != null ? String(initial.quantityValue) : '');
  const [qtyUnit, setQtyUnit] = useState<string | null>(initial.quantityUnit ?? null);
  const [rate, setRate] = useState(initial.rateValue != null ? String(initial.rateValue) : '');
  const [rateUnit, setRateUnit] = useState<RateUnit | null>(initial.rateUnit ?? null);
  const [height, setHeight] = useState(initial.mowHeightMm != null ? String(initial.mowHeightMm) : '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const hasDetails = !!(initial.productName || initial.quantityValue || initial.rateValue || initial.mowHeightMm || initial.notes);
  const [showDetails, setShowDetails] = useState(hasDetails);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = activityType(kind);
  const candidates = matchingTasks(tasks, kind, areaId);
  const suggested = candidates.find((t) => diffDays(today, t.occurrence.dueDate) <= 3) ?? null;
  const [linkChoice, setLinkChoice] = useState<Record<string, boolean>>({});
  const linkTarget = candidates[0] ?? null;
  const linkOn = linkTarget ? (linkChoice[linkTarget.occurrence.id] ?? linkTarget === suggested) : false;

  const areaOptions = [
    ...areas.map((a) => ({ value: a.id as string | null, label: a.name })),
    ...(areas.length > 1 ? [{ value: null as string | null, label: 'All areas' }] : []),
  ];

  const submit = async () => {
    setError(null);
    const quantityValue = parseNumber(qty);
    const rateValue = type.usesProduct ? parseNumber(rate) : null;
    const mowHeightMm = kind === 'mow' ? parseNumber(height) : null;
    if ([quantityValue, rateValue, mowHeightMm].some((n) => n !== null && (Number.isNaN(n) || n <= 0))) {
      return setError('Amounts must be numbers above zero, or left blank.');
    }
    if (quantityValue !== null && !qtyUnit) return setError('Choose a unit for the amount used.');
    if (rateValue !== null && !rateUnit) return setError('Choose the rate unit.');
    setBusy(true);
    try {
      await onSubmit(
        {
          kind,
          areaId,
          localDate,
          productName: type.usesProduct ? productName : null,
          quantityValue,
          quantityUnit: quantityValue !== null ? qtyUnit : null,
          rateValue,
          rateUnit: rateValue !== null ? rateUnit : null,
          mowHeightMm,
          notes,
        },
        linkOn && linkTarget ? linkTarget.occurrence.id : null,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: space.xl }}>
      {!lockedKind ? (
        <View style={{ gap: space.sm }}>
          <FieldLabel label="What did you do?" />
          <ChipGroup label="Type of job" options={ACTIVITY_TYPES.map((t) => ({ value: t.kind, label: t.label, icon: t.icon }))} value={kind} onChange={setKind} />
        </View>
      ) : null}

      {areaOptions.length > 1 && !lockedKind ? (
        <View style={{ gap: space.sm }}>
          <FieldLabel label="Where?" />
          <ChipGroup label="Lawn area" options={areaOptions} value={areaId} onChange={setAreaId} />
        </View>
      ) : null}

      <DateChoice label="When?" value={localDate} onChange={setLocalDate} today={today} direction="past" />

      {linkTarget ? (
        <Card style={{ paddingVertical: space.md }}>
          <Row>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">Count this as “{linkTarget.series.title}”</Text>
              <Text variant="caption" color="textMuted">
                {relativeDue(linkTarget.occurrence.dueDate, today)}. Turning this on marks it done and sets the next reminder.
              </Text>
            </View>
            <Switch
              value={linkOn}
              onValueChange={(v) => setLinkChoice((c) => ({ ...c, [linkTarget.occurrence.id]: v }))}
              accessibilityLabel={`Count this as ${linkTarget.series.title}`}
              trackColor={{ true: theme.primary }}
            />
          </Row>
        </Card>
      ) : null}

      <Pressable
        onPress={() => setShowDetails((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showDetails }}
        style={{ minHeight: TOUCH, justifyContent: 'center' }}>
        <Row gap={space.sm}>
          <Icon name={showDetails ? { ios: 'chevron.down', android: 'expand_more' } : { ios: 'chevron.right', android: 'chevron_right' }} color={theme.primary} size={18} />
          <Text variant="headline" color="primary">
            {showDetails ? 'Details' : type.usesProduct ? 'Add product, amount or notes' : 'Add details'}
          </Text>
        </Row>
      </Pressable>

      {showDetails ? (
        <View style={{ gap: space.lg }}>
          {kind === 'mow' ? (
            <Field label="Mowing height" optional value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="mm" />
          ) : null}
          {type.usesProduct ? (
            <>
              <Field label="Product" optional value={productName} onChangeText={setProductName} maxLength={80} />
              <Field label="Amount used" optional value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
              {qty.trim() ? (
                <ChipGroup label="Amount unit" options={QTY_UNITS.map((u) => ({ value: u as string, label: u }))} value={qtyUnit ?? undefined} onChange={setQtyUnit} />
              ) : null}
              <Field label="Rate used" optional hint="As written on the label" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
              {rate.trim() ? (
                <ChipGroup label="Rate unit" options={RATE_UNITS.map((u) => ({ value: u.unit, label: u.label }))} value={rateUnit ?? undefined} onChange={setRateUnit} />
              ) : null}
            </>
          ) : null}
          <Field label="Notes" optional value={notes} onChangeText={setNotes} multiline maxLength={500} style={{ minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }} />
        </View>
      ) : null}

      {error ? (
        <Text color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={submitLabel} onPress={submit} busy={busy} />
    </View>
  );
}
