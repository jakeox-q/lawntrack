import { Redirect } from 'expo-router';

import { AppTabs } from '@/components/app-tabs';
import { useAppData } from '@/state/app-data';

export default function TabsLayout() {
  const { snapshot } = useAppData();
  if (snapshot && !snapshot.settings.onboardingComplete) return <Redirect href="/onboarding" />;
  const dueCount = snapshot?.tasks.filter((t) => t.occurrence.dueDate <= snapshot.today).length ?? 0;
  return <AppTabs dueCount={dueCount} />;
}
