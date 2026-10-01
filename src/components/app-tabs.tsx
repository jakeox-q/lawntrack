import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

/** Platform tab bar on iOS and Android. */
export function AppTabs({ dueCount }: { dueCount: number }) {
  const theme = useTheme();
  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.primarySoft}
      tintColor={theme.primary}
      labelStyle={{ selected: { color: theme.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sun.max.fill" md="wb_sunny" />
        {dueCount > 0 ? <NativeTabs.Trigger.Badge>{String(dueCount)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lawn">
        <NativeTabs.Trigger.Label>My lawn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="leaf.fill" md="yard" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
