import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { ActivityForm } from '@/components/activity-form';
import { Banner, Button, EmptyState, Screen } from '@/components/ui';
import { useAppData, useSnapshot } from '@/state/app-data';
import { showDialog } from '@/components/dialog';
import { closeScreen } from '@/components/navigation';

export default function EditActivity() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSnapshot();
  const { act, run, showToast } = useAppData();
  const activity = s.activities.find((a) => a.id === id);
  if (!activity) {
    return (
      <Screen>
        <EmptyState icon={{ ios: 'questionmark.circle', android: 'help' }} title="Entry not found" body="It may have been deleted." />
      </Screen>
    );
  }
  const linked = activity.seriesId ? s.series.find((x) => x.id === activity.seriesId) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        {activity.seriesId ? (
          <Banner
            tone="info"
            title={`Counts toward “${linked?.title ?? activity.title ?? 'a reminder'}”`}
            body="Changing the date updates when you’re reminded next, unless a later entry already counts."
          />
        ) : null}
        <ActivityForm
          initial={activity}
          areas={s.areas}
          tasks={[]}
          today={s.today}
          lockedKind={!!activity.seriesId}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            if (!(await run((r) => r.updateActivity(activity.id, input)))) return;
            closeScreen();
            showToast('Entry updated');
          }}
        />
        <Button
          variant="danger"
          label="Delete entry"
          onPress={() =>
            showDialog(
              'Delete this entry?',
              activity.seriesId ? 'If it was the latest time you did this job, the reminder will be recalculated.' : 'This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    const res = await act((r) => r.deleteActivity(activity.id));
                    if (!res) return;
                    closeScreen();
                    showToast(res.reopened ? 'Entry deleted · task reopened' : 'Entry deleted');
                  },
                },
              ],
            )
          }
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
