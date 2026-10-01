import { router } from 'expo-router';
import { View } from 'react-native';

import { activityLine } from '@/components/summaries';
import { Button, Card, EmptyState, IconBadge, Row, Screen, Section, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import type { Activity } from '@/data/types';
import { activityType } from '@/domain/activity-types';
import { formatMonth, relativePast } from '@/domain/format';
import { useSnapshot } from '@/state/app-data';

export default function HistoryScreen() {
  const s = useSnapshot();
  const months: { key: string; items: Activity[] }[] = [];
  for (const a of s.activities) {
    const key = a.localDate.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.key === key) last.items.push(a);
    else months.push({ key, items: [a] });
  }

  return (
    <Screen
      tabScreen
      title="History"
      action={<Button compact label="Log" icon={{ ios: 'plus', android: 'add' }} onPress={() => router.push('/log')} />}>
      {months.length === 0 ? (
        <EmptyState
          icon={{ ios: 'clock.arrow.circlepath', android: 'history' }}
          title="Nothing logged yet"
          body="Everything you mark done or log shows here, newest first. You can edit or backdate entries."
          action={<Button label="Log lawn work" onPress={() => router.push('/log')} />}
        />
      ) : null}
      {months.map((m) => (
        <Section key={m.key} title={formatMonth(`${m.key}-01`)}>
          {m.items.map((a) => {
            const type = activityType(a.kind);
            const custom = a.title && a.title !== type.label ? a.title : null;
            const line = [custom, activityLine(a, s.areas)].filter(Boolean).join(' · ');
            const title = type.done;
            return (
              <Card
                key={a.id}
                onPress={() => router.push({ pathname: '/activity/[id]', params: { id: a.id } })}
                accessibilityLabel={`${title}, ${relativePast(a.localDate, s.today)}${line ? `, ${line}` : ''}`}
                accessibilityHint="Edit or delete this entry"
                style={{ paddingVertical: space.md }}>
                <Row>
                  <IconBadge name={type.icon} tone="primary" size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="headline" numberOfLines={1}>
                      {title}
                    </Text>
                    {line ? (
                      <Text variant="caption" color="textMuted" numberOfLines={2}>
                        {line}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="label" color="textMuted">
                    {relativePast(a.localDate, s.today)}
                  </Text>
                </Row>
              </Card>
            );
          })}
        </Section>
      ))}
    </Screen>
  );
}
