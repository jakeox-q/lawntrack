import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, IconBadge, IconButton, Pill, Row, Text, type Tone } from '@/components/ui';
import { space } from '@/constants/theme';
import type { TaskItem } from '@/data/types';
import { activityType } from '@/domain/activity-types';
import type { LocalDate } from '@/domain/dates';
import { relativeDue } from '@/domain/format';
import { dueState, type DueState } from '@/domain/schedule';

export const CHECK = { ios: 'checkmark', android: 'check' };

export function dueTone(state: DueState): Tone {
  switch (state) {
    case 'overdue':
      return 'danger';
    case 'today':
      return 'accent';
    case 'soon':
      return 'primary';
    default:
      return 'neutral';
  }
}

export function taskSubtitle(t: TaskItem): string {
  const parts = [t.area?.name, t.series.productName].filter(Boolean);
  return parts.length ? parts.join(' · ') : activityType(t.series.kind).label;
}

/** A compact row: tap to open, round button to mark done today. */
export function TaskRow({ task, today, onDone }: { task: TaskItem; today: LocalDate; onDone: () => void }) {
  const type = activityType(task.series.kind);
  const state = dueState(task.occurrence.dueDate, today);
  const due = relativeDue(task.occurrence.dueDate, today);
  return (
    <Card
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.occurrence.id } })}
      accessibilityLabel={`${task.series.title}, ${taskSubtitle(task)}, ${due}`}
      accessibilityHint="Opens task details"
      style={{ paddingVertical: space.md }}>
      <Row>
        <IconBadge name={type.icon} tone={dueTone(state)} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" numberOfLines={1}>
            {task.series.title}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {taskSubtitle(task)}
          </Text>
          <Text variant="label" color={state === 'overdue' ? 'danger' : state === 'today' ? 'accent' : 'textMuted'}>
            {due}
          </Text>
        </View>
        <IconButton icon={CHECK} label={`Mark ${task.series.title} done today`} onPress={onDone} />
      </Row>
    </Card>
  );
}

export function DuePill({ due, today }: { due: LocalDate; today: LocalDate }) {
  return <Pill label={relativeDue(due, today)} tone={dueTone(dueState(due, today))} />;
}
