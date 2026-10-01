import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { CHECK, DuePill, taskSubtitle } from '@/components/tasks';
import { Banner, Button, Card, ChipGroup, EmptyState, FieldLabel, IconBadge, Row, Screen, Section, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import { activityType } from '@/domain/activity-types';
import { calculateQuantity, rateUnitLabel } from '@/domain/calculator';
import { instantToLocalDate, instantToLocalTime } from '@/domain/dates';
import { explainRule, formatArea, formatDate, formatTime } from '@/domain/format';
import { snoozeChoices } from '@/domain/snooze';
import { useAppData, useSnapshot } from '@/state/app-data';
import { usePickers } from '@/state/pickers';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSnapshot();
  const { act, run, completeTask, snoozeTask, showToast } = useAppData();
  const { pickDate } = usePickers();
  const task = s.tasks.find((t) => t.occurrence.id === id);

  if (!task) {
    return (
      <Screen>
        <EmptyState
          icon={{ ios: 'checkmark.circle', android: 'task_alt' }}
          title="This task is closed"
          body="It has been done, skipped or removed. Check History or Plan."
          action={<Button label="Back to Today" onPress={() => router.navigate('/')} />}
        />
      </Screen>
    );
  }

  const { occurrence, series, area } = task;
  const type = activityType(series.kind);
  const rule = { mode: series.mode, intervalDays: series.intervalDays, startDate: series.startDate };
  const calc =
    series.rateValue != null && series.rateUnit && area?.sizeM2
      ? calculateQuantity({ areaM2: area.sizeM2, rate: series.rateValue, unit: series.rateUnit, source: 'user' })
      : null;
  const snoozedUntil = occurrence.snoozedUntil ? Date.parse(occurrence.snoozedUntil) : null;
  const choices = snoozeChoices(new Date(), s.timeZone, series.reminderTime);

  const done = async () => {
    if (await completeTask(occurrence.id)) router.back();
  };

  const doneOtherDay = async () => {
    const date = await pickDate({ title: 'When did you do it?', value: s.today, max: s.today });
    if (date && (await completeTask(occurrence.id, date))) router.back();
  };

  const reschedule = async () => {
    const date = await pickDate({ title: 'Move to', value: occurrence.dueDate });
    if (!date) return;
    if (await run((r) => r.rescheduleOccurrence(occurrence.id, date))) showToast(`Moved to ${formatDate(date, s.today)}`);
  };

  const skip = () => {
    const doSkip = async (next: string | null) => {
      const res = await act((r) => r.skipOccurrence(occurrence.id, next));
      if (!res) return;
      router.back();
      const msg = res.paused ? 'Skipped · reminder paused' : res.successorDue ? `Skipped · next ${formatDate(res.successorDue, s.today)}` : 'Skipped';
      showToast(msg, async () => {
        await act((r) => r.reopenOccurrence(occurrence.id));
      });
    };
    if (series.mode === 'after_completion') {
      Alert.alert(
        'Skip this time?',
        'This reminder counts from when you do the job, so nothing will be recorded. Choose when to be reminded next, or pause it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pause reminder', onPress: () => void doSkip(null) },
          {
            text: 'Pick next date',
            onPress: async () => {
              const d = await pickDate({ title: 'Next reminder', value: s.today, min: s.today });
              if (d) await doSkip(d);
            },
          },
        ],
      );
    } else {
      Alert.alert('Skip this time?', series.mode === 'once' ? 'This one-off reminder will close without being recorded.' : 'Nothing is recorded. Later dates stay the same.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => void doSkip(null) },
      ]);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: type.label }} />
      <Row style={{ alignItems: 'flex-start' }}>
        <IconBadge name={type.icon} size={64} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="display" style={{ fontSize: 28, lineHeight: 34 }}>
            {series.title}
          </Text>
          <Text color="textMuted">{taskSubtitle(task)}</Text>
          <DuePill due={occurrence.dueDate} today={s.today} />
        </View>
      </Row>

      <Card>
        <FieldLabel label="Why it’s due" />
        <Text>{explainRule(rule, task.lastDone, s.today)}</Text>
        <Text variant="caption" color="textMuted">
          Due {formatDate(occurrence.dueDate, s.today)}
          {snoozedUntil
            ? ` · reminder snoozed to ${formatDate(instantToLocalDate(snoozedUntil, s.timeZone), s.today)} ${formatTime(instantToLocalTime(snoozedUntil, s.timeZone))}`
            : ` · reminder at ${formatTime(series.reminderTime)}`}
        </Text>
      </Card>

      {series.productName || series.rateValue != null ? (
        <Card>
          <FieldLabel label="Product" />
          {series.productName ? <Text variant="headline">{series.productName}</Text> : null}
          {series.rateValue != null && series.rateUnit ? (
            <Text color="textMuted">
              Rate you entered: {series.rateValue} {rateUnitLabel(series.rateUnit)}
            </Text>
          ) : null}
          {calc ? (
            <View style={{ gap: 2 }}>
              <Text variant="title">You’ll need {calc.text}</Text>
              <Text variant="caption" color="textMuted">
                {calc.workings} for {area!.name} ({formatArea(area!.sizeM2)}). Always check the product label before applying.
              </Text>
            </View>
          ) : series.rateValue != null && !area?.sizeM2 ? (
            <Text variant="caption" color="textMuted">
              Add the size of {area?.name ?? 'this area'} to see how much product you need.
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Button label="Mark done today" icon={CHECK} onPress={done} />
      <Button label="Done on another day" variant="secondary" onPress={doneOtherDay} />

      <Section title="Not today?">
        <ChipGroup
          label="Snooze reminder"
          options={choices.map((c) => ({ value: c.key as string, label: `Remind ${c.label.toLowerCase()}` }))}
          value={undefined}
          onChange={async (key) => {
            const c = choices.find((x) => x.key === key)!;
            await snoozeTask(occurrence.id, c.until, c.label);
          }}
        />
        <Text variant="caption" color="textMuted">
          Snoozing only moves the reminder. The job stays due {formatDate(occurrence.dueDate, s.today)}.
        </Text>
        <Row gap={space.sm}>
          <Button compact variant="secondary" label="Move date" onPress={reschedule} style={{ flex: 1 }} />
          <Button compact variant="secondary" label="Skip" onPress={skip} style={{ flex: 1 }} />
        </Row>
      </Section>

      {series.mode === 'after_completion' && !task.lastDone ? (
        <Banner tone="neutral" title="First time?" body="The first date is the one you chose. After you mark it done, the next date counts from that day." />
      ) : null}

      <Button variant="ghost" label="Edit reminder" onPress={() => router.push({ pathname: '/series/[id]', params: { id: series.id } })} />
    </Screen>
  );
}
