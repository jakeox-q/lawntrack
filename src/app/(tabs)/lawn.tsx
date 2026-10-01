import { router } from 'expo-router';
import { View } from 'react-native';

import { Banner, Button, Card, Icon, IconBadge, Row, Screen, Section, Text } from '@/components/ui';
import { formatArea } from '@/domain/format';
import { useTheme } from '@/hooks/use-theme';
import { useAppData, useSnapshot } from '@/state/app-data';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' };

export default function LawnScreen() {
  const s = useSnapshot();
  const theme = useTheme();
  const { permission } = useAppData();
  const total = s.areas.reduce((sum, a) => sum + (a.sizeM2 ?? 0), 0);

  return (
    <Screen tabScreen title="My lawn" subtitle={total ? `${formatArea(total)} in total` : undefined}>
      <Section
        title="Lawn areas"
        action={<Button compact variant="ghost" label="Add area" onPress={() => router.push({ pathname: '/area/[id]', params: { id: 'new' } })} />}>
        {s.areas.map((a) => (
          <Card
            key={a.id}
            onPress={() => router.push({ pathname: '/area/[id]', params: { id: a.id } })}
            accessibilityLabel={`${a.name}, ${formatArea(a.sizeM2)}${a.grassType ? `, ${a.grassType}` : ''}`}>
            <Row>
              <IconBadge name={{ ios: 'leaf.fill', android: 'yard' }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline">{a.name}</Text>
                <Text variant="caption" color="textMuted">
                  {formatArea(a.sizeM2)}
                  {a.grassType ? ` · ${a.grassType}` : ''}
                </Text>
              </View>
              <Icon name={CHEVRON} color={theme.textMuted} size={16} />
            </Row>
          </Card>
        ))}
      </Section>

      <Section title="Tools">
        <ToolRow
          icon={{ ios: 'function', android: 'calculate' }}
          title="Product calculator"
          body="How much product for an area, from your label rate"
          onPress={() => router.push('/calculator')}
        />
        <ToolRow
          icon={{ ios: 'bell.fill', android: 'notifications' }}
          title="Reminders"
          body={permission?.state === 'granted' ? 'On · test, default time and status' : 'Off · turn on or troubleshoot'}
          onPress={() => router.push('/reminders')}
        />
      </Section>

      <Banner
        tone="neutral"
        icon={{ ios: 'iphone', android: 'smartphone' }}
        title="Stored on this phone"
        body="This preview keeps your lawn data on this device only. Accounts and backup come before public release."
      />
    </Screen>
  );
}

function ToolRow({ icon, title, body, onPress }: { icon: { ios: string; android: string }; title: string; body: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}. ${body}`}>
      <Row>
        <IconBadge name={icon} tone="info" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{title}</Text>
          <Text variant="caption" color="textMuted">
            {body}
          </Text>
        </View>
        <Icon name={CHEVRON} color={theme.textMuted} size={16} />
      </Row>
    </Card>
  );
}
