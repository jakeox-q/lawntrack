import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { SeriesForm } from '@/components/series-form';
import { Screen } from '@/components/ui';
import { isActivityKind } from '@/domain/activity-types';
import { formatDate } from '@/domain/format';
import { useAppData, useSnapshot } from '@/state/app-data';
import { closeScreen } from '@/components/navigation';

export default function NewSeries() {
  const s = useSnapshot();
  const { act, showToast, permission, requestPermission } = useAppData();
  const params = useLocalSearchParams<{ kind?: string }>();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <SeriesForm
          initial={{ kind: isActivityKind(params.kind) ? params.kind : 'mow' }}
          areas={s.areas}
          today={s.today}
          defaultReminderTime={s.settings.reminderTime}
          submitLabel="Create reminder"
          onSubmit={async (input) => {
            const res = await act((r) => r.createSeries(input));
            if (!res) return;
            closeScreen();
            showToast(`Reminder set for ${formatDate(input.startDate, s.today)}`);
            // Ask for permission right after the user has chosen a reminder, never before.
            if (permission?.state === 'undetermined' && permission.canAskAgain) await requestPermission();
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
