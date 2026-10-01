import { router } from 'expo-router';
import { View } from 'react-native';

import { scheduleSummary } from '@/components/summaries';
import { TaskRow } from '@/components/tasks';
import { Button, Card, EmptyState, IconBadge, Pill, Row, Screen, Section, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import type { TaskItem } from '@/data/types';
import { activityType } from '@/domain/activity-types';
import { diffDays } from '@/domain/dates';
import { useAppData, useSnapshot } from '@/state/app-data';

export default function PlanScreen() {
  const s = useSnapshot();
  const { completeTask } = useAppData();
  const groups: { title: string; items: TaskItem[] }[] = [
    { title: 'Overdue', items: s.tasks.filter((t) => diffDays(s.today, t.occurrence.dueDate) < 0) },
    { title: 'Next 7 days', items: s.tasks.filter((t) => { const d = diffDays(s.today, t.occurrence.dueDate); return d >= 0 && d <= 7; }) },
    { title: 'Later', items: s.tasks.filter((t) => diffDays(s.today, t.occurrence.dueDate) > 7) },
  ];
  const activeIds = new Set(s.tasks.map((t) => t.series.id));
  const inactive = s.series.filter((x) => !activeIds.has(x.id));
  const areaName = (id: string | null) => s.areas.find((a) => a.id === id)?.name ?? 'All areas';

  return (
    <Screen
      tabScreen
      title="Plan"
      action={<Button compact label="New" icon={{ ios: 'plus', android: 'add' }} onPress={() => router.push('/series/new')} />}>
      {s.series.length === 0 ? (
        <EmptyState
          icon={{ ios: 'calendar.badge.plus', android: 'event_repeat' }}
          title="Plan your lawn jobs"
          body="Reminders can repeat after you do the job, on set dates, or just once."
          action={<Button label="Add a reminder" onPress={() => router.push('/series/new')} />}
        />
      ) : null}

      {groups.map((g) =>
        g.items.length ? (
          <Section key={g.title} title={g.title}>
            {g.items.map((t) => (
              <View key={t.occurrence.id} style={{ gap: space.xs }}>
                <TaskRow task={t} today={s.today} onDone={() => completeTask(t.occurrence.id)} />
                <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg }}>
                  {scheduleSummary(t.series)}
                </Text>
              </View>
            ))}
          </Section>
        ) : null,
      )}

      {inactive.length ? (
        <Section title="Paused or finished">
          {inactive.map((x) => (
            <Card
              key={x.id}
              onPress={() => router.push({ pathname: '/series/[id]', params: { id: x.id } })}
              accessibilityLabel={`${x.title}, ${x.paused ? 'paused' : 'finished'}`}>
              <Row>
                <IconBadge name={activityType(x.kind).icon} tone="neutral" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="headline">{x.title}</Text>
                  <Text variant="caption" color="textMuted">
                    {areaName(x.areaId)} · {scheduleSummary(x)}
                  </Text>
                </View>
                <Pill label={x.paused ? 'Paused' : 'Finished'} />
              </Row>
            </Card>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
