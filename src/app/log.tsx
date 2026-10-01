import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { ActivityForm } from '@/components/activity-form';
import { Screen } from '@/components/ui';
import { activityType, isActivityKind } from '@/domain/activity-types';
import { formatDate } from '@/domain/format';
import { useAppData, useSnapshot } from '@/state/app-data';

export default function LogScreen() {
  const s = useSnapshot();
  const { act, showToast } = useAppData();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = isActivityKind(params.kind) ? params.kind : 'mow';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ActivityForm
          initial={{ kind }}
          areas={s.areas}
          tasks={s.tasks}
          today={s.today}
          submitLabel="Save"
          onSubmit={async (input, link) => {
            const res = await act((r) => r.logActivity(input, link));
            if (!res) return;
            router.back();
            const next = res.successorDue ? ` · next ${formatDate(res.successorDue, s.today)}` : '';
            showToast(`${activityType(input.kind).done}${next}`, async () => {
              await act((r) => r.deleteActivity(res.activityId!));
            });
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
