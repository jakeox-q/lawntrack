import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, ChipGroup, Field, FieldLabel, parseNumber, Screen, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import { GRASS_TYPES } from '@/domain/activity-types';
import { useAppData, useSnapshot } from '@/state/app-data';
import { showDialog } from '@/components/dialog';
import { closeScreen } from '@/components/navigation';

const NOT_SURE = 'Not sure';

export default function AreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSnapshot();
  const { run, showToast } = useAppData();
  const area = id === 'new' ? null : (s.areas.find((a) => a.id === id) ?? null);
  const [name, setName] = useState(area?.name ?? '');
  const [size, setSize] = useState(area?.sizeM2 != null ? String(area.sizeM2) : '');
  const [grass, setGrass] = useState(area?.grassType ?? NOT_SURE);
  const [notes, setNotes] = useState(area?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const reminders = area ? s.series.filter((x) => x.areaId === area.id).length : 0;

  const save = async () => {
    const sizeM2 = parseNumber(size);
    if (sizeM2 !== null && (Number.isNaN(sizeM2) || sizeM2 <= 0)) return setError('Enter the size as a number, or leave it blank.');
    setError(null);
    const input = { name, sizeM2, grassType: grass === NOT_SURE ? null : grass, notes };
    const ok = await run((r) => (area ? r.updateArea(area.id, input) : r.createArea(input)));
    if (!ok) return;
    closeScreen();
    showToast(area ? 'Area updated' : 'Area added');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Back lawn, Verge" maxLength={40} />
        <Field
          label="Size"
          optional
          value={size}
          onChangeText={setSize}
          keyboardType="decimal-pad"
          suffix="m²"
          error={error}
          hint="Length × width works for a rectangle. Map measuring is coming."
        />
        <View style={{ gap: space.sm }}>
          <FieldLabel label="Grass type" optional />
          <ChipGroup label="Grass type" options={[...GRASS_TYPES, NOT_SURE].map((g) => ({ value: g as string, label: g }))} value={grass} onChange={setGrass} />
        </View>
        <Field label="Notes" optional value={notes} onChangeText={setNotes} multiline maxLength={500} style={{ minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }} />
        <Button label={area ? 'Save changes' : 'Add area'} onPress={save} disabled={!name.trim()} />
        {area && s.areas.length > 1 ? (
          <Button
            variant="danger"
            label="Remove area"
            onPress={() =>
              showDialog(
                `Remove ${area.name}?`,
                `${reminders ? `Its ${reminders} reminder${reminders === 1 ? '' : 's'} will be deleted. ` : ''}Logged work stays in History.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      if (!(await run((r) => r.deleteArea(area.id)))) return;
                      closeScreen();
                      showToast('Area removed');
                    },
                  },
                ],
              )
            }
          />
        ) : area ? (
          <Text variant="caption" color="textMuted">
            You need at least one lawn area, so this one can’t be removed.
          </Text>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
