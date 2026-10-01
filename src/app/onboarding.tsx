import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { SeriesForm } from '@/components/series-form';
import { Banner, Button, ChipGroup, Field, FieldLabel, IconBadge, parseNumber, Screen, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import type { SeriesInput } from '@/data/types';
import { GRASS_TYPES } from '@/domain/activity-types';
import { useTheme } from '@/hooks/use-theme';
import { useAppData, useSnapshot } from '@/state/app-data';

type Step = 'lawn' | 'reminder' | 'notify';
const STEPS: Step[] = ['lawn', 'reminder', 'notify'];
const NOT_SURE = 'Not sure';

/**
 * Three short steps to the first useful result: a lawn, one reminder, permission.
 * Products, history and location are asked for later, when a feature needs them.
 */
export default function Onboarding() {
  const s = useSnapshot();
  const { act, requestPermission, deviceZone, repo } = useAppData();
  const [step, setStep] = useState<Step>(s.areas.length ? 'reminder' : 'lawn');
  const [name, setName] = useState('Front lawn');
  const [size, setSize] = useState('');
  const [grass, setGrass] = useState<string>(NOT_SURE);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [createdReminder, setCreatedReminder] = useState(false);

  const finish = async () => {
    await act((r) => r.completeOnboarding(deviceZone));
    router.replace('/');
  };

  const saveLawn = async () => {
    const sizeM2 = parseNumber(size);
    if (sizeM2 !== null && (Number.isNaN(sizeM2) || sizeM2 <= 0)) return setSizeError('Enter the size as a number, or leave it blank.');
    setSizeError(null);
    // Store the zone now so the first reminder is scheduled in the right place.
    await repo.setTimeZone(deviceZone);
    const id = await act((r) => r.createArea({ name, sizeM2, grassType: grass === NOT_SURE ? null : grass }));
    if (id) setStep('reminder');
  };

  const saveReminder = async (input: SeriesInput) => {
    const res = await act((r) => r.createSeries(input));
    if (res) {
      setCreatedReminder(true);
      // Browsers can't receive these reminders, so the preview goes straight to Today.
      if (Platform.OS === 'web') await finish();
      else setStep('notify');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen tabScreen>
        <Progress step={step} />
        {step === 'lawn' ? (
          <View style={{ gap: space.xl }}>
            <View style={{ gap: space.sm }}>
              <Text variant="display" accessibilityRole="header">
                Let’s set up your lawn
              </Text>
              <Text color="textMuted">Know what your lawn needs next, get reminded on the day, and keep a record of what you’ve done.</Text>
            </View>
            <Field label="Name this lawn" value={name} onChangeText={setName} maxLength={40} hint="Add more areas, like the back lawn or verge, later." />
            <Field
              label="Size"
              optional
              value={size}
              onChangeText={setSize}
              keyboardType="decimal-pad"
              suffix="m²"
              hint="Used to work out product amounts. Skip it if you don’t know yet."
              error={sizeError}
            />
            <View style={{ gap: space.sm }}>
              <FieldLabel label="Grass type" optional />
              <ChipGroup
                label="Grass type"
                options={[...GRASS_TYPES, NOT_SURE].map((g) => ({ value: g as string, label: g }))}
                value={grass}
                onChange={setGrass}
              />
            </View>
            <Button label="Next" onPress={saveLawn} disabled={!name.trim()} />
          </View>
        ) : null}

        {step === 'reminder' ? (
          <View style={{ gap: space.xl }}>
            <View style={{ gap: space.sm }}>
              <Text variant="display" accessibilityRole="header">
                Your first reminder
              </Text>
              <Text color="textMuted">Start with one job. Mowing is a good first one. You can add the rest later.</Text>
            </View>
            <SeriesForm
              areas={s.areas}
              today={s.today}
              defaultReminderTime={s.settings.reminderTime}
              submitLabel="Create reminder"
              onSubmit={saveReminder}
              footer={<Button variant="ghost" label="Skip for now" onPress={finish} />}
            />
          </View>
        ) : null}

        {step === 'notify' ? <NotifyStep created={createdReminder} onDone={finish} onRequest={requestPermission} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Progress({ step }: { step: Step }) {
  const theme = useTheme();
  const index = STEPS.indexOf(step);
  return (
    <View
      style={{ flexDirection: 'row', gap: space.sm }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}
      accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }}>
      {STEPS.map((x, i) => (
        <View key={x} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= index ? theme.primary : theme.border }} />
      ))}
    </View>
  );
}

function NotifyStep({
  created,
  onDone,
  onRequest,
}: {
  created: boolean;
  onDone: () => Promise<void>;
  onRequest: () => Promise<{ state: string }>;
}) {
  const [result, setResult] = useState<string | null>(null);
  return (
    <View style={{ gap: space.xl }}>
      <IconBadge name={{ ios: 'bell.badge.fill', android: 'notifications_active' }} size={72} />
      <View style={{ gap: space.sm }}>
        <Text variant="display" accessibilityRole="header">
          Get a nudge on the day
        </Text>
        <Text color="textMuted">
          {created ? 'Your reminder is saved. ' : ''}Allow notifications and we’ll remind you at the time you chose. You can mark a job done or
          snooze it straight from the notification.
        </Text>
      </View>
      {result === 'denied' ? (
        <Banner
          tone="info"
          title="No problem"
          body="Everything due will still show on the Today screen. You can turn reminders on later from My lawn."
        />
      ) : null}
      {result === null ? (
        <>
          <Button
            label="Allow notifications"
            onPress={async () => {
              const p = await onRequest();
              if (p.state === 'granted') await onDone();
              else setResult('denied');
            }}
          />
          <Button variant="ghost" label="Not now" onPress={onDone} />
        </>
      ) : (
        <Button label="Go to my lawn" onPress={onDone} />
      )}
    </View>
  );
}
