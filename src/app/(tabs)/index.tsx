import { router } from 'expo-router';
import { View } from 'react-native';

import { CHECK, DuePill, TaskRow, taskSubtitle } from '@/components/tasks';
import { Banner, Button, Card, EmptyState, IconBadge, Row, Screen, Section, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import type { TaskItem } from '@/data/types';
import { activityType } from '@/domain/activity-types';
import { diffDays, type LocalDate, weekday } from '@/domain/dates';
import { explainRule, formatDate } from '@/domain/format';
import { dueState } from '@/domain/schedule';
import { useAppData, useSnapshot } from '@/state/app-data';

const QUICK_LOG = ['mow', 'fertilise_granular', 'weed_control', 'other'] as const;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TodayScreen() {
  const s = useSnapshot();
  const { completeTask, permission, requestPermission } = useAppData();
  const [next, ...rest] = s.tasks;
  const upcoming = rest.filter((t) => diffDays(s.today, t.occurrence.dueDate) <= 14);
  const laterCount = rest.length - upcoming.length;
  const dueNow = s.tasks.filter((t) => ['overdue', 'today'].includes(dueState(t.occurrence.dueDate, s.today))).length;

  return (
    <Screen tabScreen title="Today" subtitle={`${DAY_NAMES[weekday(s.today)]} ${formatDate(s.today).slice(4)}`}>
      {s.tasks.length > 0 && permission && permission.state !== 'granted' ? (
        <Banner
          tone="info"
          icon={{ ios: 'bell.slash', android: 'notifications_off' }}
          title="Reminders are off"
          body="Your plan still shows here. Turn reminders on to get a nudge on the day."
          action={
            <Button
              compact
              variant="secondary"
              label={permission.canAskAgain ? 'Turn on reminders' : 'Open reminder settings'}
              onPress={() => (permission.canAskAgain ? requestPermission() : router.push('/reminders'))}
            />
          }
        />
      ) : null}

      {next ? (
        <Section title={dueNow > 1 ? `${dueNow} jobs due` : 'Up next'}>
          <NextCard task={next} today={s.today} onDone={() => completeTask(next.occurrence.id)} />
        </Section>
      ) : (
        <EmptyState
          icon={{ ios: 'checkmark.seal.fill', android: 'verified' }}
          title={s.series.length ? 'All caught up' : 'No reminders yet'}
          body={
            s.series.length
              ? 'Nothing is scheduled. Paused reminders are in Plan.'
              : 'Add a reminder for mowing, feeding or anything else and it will show here.'
          }
          action={<Button label="Add a reminder" onPress={() => router.push('/series/new')} />}
        />
      )}

      {upcoming.length ? (
        <Section title="Coming up">
          {upcoming.map((t) => (
            <TaskRow key={t.occurrence.id} task={t} today={s.today} onDone={() => completeTask(t.occurrence.id)} />
          ))}
          {laterCount > 0 ? (
            <Button variant="ghost" compact label={`${laterCount} more in Plan`} onPress={() => router.navigate('/plan')} />
          ) : null}
        </Section>
      ) : null}

      <Section title="Log something you did">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {QUICK_LOG.map((kind) => {
            const type = activityType(kind);
            return (
              <Card
                key={kind}
                onPress={() => router.push({ pathname: '/log', params: { kind } })}
                accessibilityLabel={`Log ${type.label}`}
                style={{ flexGrow: 1, flexBasis: '45%', paddingVertical: space.md }}>
                <Row gap={space.sm}>
                  <IconBadge name={type.icon} size={36} tone="neutral" />
                  <Text variant="label" style={{ flex: 1 }} numberOfLines={2}>
                    {kind === 'other' ? 'Something else' : type.label}
                  </Text>
                </Row>
              </Card>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}

function NextCard({ task, today, onDone }: { task: TaskItem; today: LocalDate; onDone: () => void }) {
  const type = activityType(task.series.kind);
  const state = dueState(task.occurrence.dueDate, today);
  return (
    <Card style={{ gap: space.lg }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <IconBadge name={type.icon} size={56} tone={state === 'overdue' ? 'danger' : state === 'today' ? 'accent' : 'primary'} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="title">{task.series.title}</Text>
          <Text color="textMuted">{taskSubtitle(task)}</Text>
          <DuePill due={task.occurrence.dueDate} today={today} />
        </View>
      </Row>
      <Text variant="caption" color="textMuted">
        {explainRule(
          { mode: task.series.mode, intervalDays: task.series.intervalDays, startDate: task.series.startDate },
          task.lastDone,
          today,
        )}
      </Text>
      <Row gap={space.sm}>
        <Button label="Mark done" icon={CHECK} onPress={onDone} style={{ flex: 1 }} />
        <Button
          label="Options"
          variant="secondary"
          onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.occurrence.id } })}
          accessibilityHint="Snooze, skip, move or mark done on another day"
        />
      </Row>
    </Card>
  );
}
