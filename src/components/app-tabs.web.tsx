import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', title: 'Today', icon: { ios: 'sun.max.fill', android: 'wb_sunny' } },
  { name: 'plan', title: 'Plan', icon: { ios: 'calendar', android: 'calendar_month' } },
  { name: 'history', title: 'History', icon: { ios: 'clock.arrow.circlepath', android: 'history' } },
  { name: 'lawn', title: 'My lawn', icon: { ios: 'leaf.fill', android: 'yard' } },
];

/** Browser preview: a JavaScript tab bar styled like the native one. */
export function AppTabs({ dueCount }: { dueCount: number }) {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarBadgeStyle: { backgroundColor: theme.accent, color: theme.surface },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarBadge: t.name === 'index' && dueCount > 0 ? dueCount : undefined,
            tabBarIcon: ({ color }) => <Icon name={t.icon} color={String(color)} size={24} />,
          }}
        />
      ))}
    </Tabs>
  );
}
