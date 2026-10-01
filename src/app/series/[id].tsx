import { router, useLocalSearchParams } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { SeriesForm } from '@/components/series-form';
import { Banner, Button, EmptyState, Screen } from '@/components/ui';
import { space } from '@/constants/theme';
import { useAppData, useSnapshot } from '@/state/app-data';
import { usePickers } from '@/state/pickers';

export default function EditSeries() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSnapshot();
  const { run, showToast } = useAppData();
  const { pickDate } = usePickers();
  const series = s.series.find((x) => x.id === id);
  if (!series) {
    return (
      <Screen>
        <EmptyState icon={{ ios: 'questionmark.circle', android: 'help' }} title="Reminder not found" body="It may have been deleted." />
      </Screen>
    );
  }
  const open = s.tasks.find((t) => t.series.id === id);

  const resume = async () => {
    const d = await pickDate({ title: 'Next reminder', value: s.today, min: s.today });
    if (!d) return;
    if (await run((r) => r.resumeSeries(series.id, d))) showToast('Reminder resumed');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        {series.paused ? (
          <Banner tone="accent" title="Paused" body="No reminders will be sent until you resume." action={<Button compact label="Resume" onPress={resume} />} />
        ) : !open ? (
          <Banner tone="neutral" title="Finished" body="This reminder has no upcoming date." action={<Button compact label="Schedule again" onPress={resume} />} />
        ) : null}
        <SeriesForm
          initial={series}
          areas={s.areas}
          today={s.today}
          defaultReminderTime={series.reminderTime}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            if (!(await run((r) => r.updateSeries(series.id, input)))) return;
            router.back();
            showToast('Reminder updated');
          }}
        />
        <View style={{ gap: space.sm }}>
          {!series.paused && open ? (
            <Button
              variant="secondary"
              label="Pause reminder"
              onPress={async () => {
                if (await run((r) => r.pauseSeries(series.id))) showToast('Reminder paused');
              }}
            />
          ) : null}
          <Button
            variant="danger"
            label="Delete reminder"
            onPress={() =>
              Alert.alert('Delete this reminder?', 'Future reminders stop. Work you have already logged stays in History.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    if (!(await run((r) => r.deleteSeries(series.id)))) return;
                    router.dismissAll();
                    showToast('Reminder deleted');
                  },
                },
              ])
            }
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
