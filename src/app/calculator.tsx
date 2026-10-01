import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Banner, Card, ChipGroup, Field, FieldLabel, parseNumber, Screen, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import { calculateQuantity, isRateUnit, RATE_UNITS, type RateUnit, validateCalculation } from '@/domain/calculator';
import { useSnapshot } from '@/state/app-data';

const MANUAL = '__manual__';

export default function Calculator() {
  const s = useSnapshot();
  const params = useLocalSearchParams<{ rate?: string; unit?: string }>();
  const firstSized = s.areas.find((a) => a.sizeM2);
  const [areaChoice, setAreaChoice] = useState<string>(firstSized?.id ?? MANUAL);
  const [manualArea, setManualArea] = useState('');
  const [rate, setRate] = useState(params.rate ?? '');
  const [unit, setUnit] = useState<RateUnit>(isRateUnit(params.unit) ? params.unit : 'g/m2');

  const chosen = s.areas.find((a) => a.id === areaChoice);
  const areaM2 = areaChoice === MANUAL ? parseNumber(manualArea) : (chosen?.sizeM2 ?? null);
  const rateValue = parseNumber(rate);
  const input = { areaM2: areaM2 ?? undefined, rate: rateValue ?? undefined, unit };
  const touched = rate.trim() !== '' && areaM2 !== null;
  const error = touched ? validateCalculation(input) : null;
  const result = touched && !error ? calculateQuantity({ areaM2: areaM2!, rate: rateValue!, unit, source: 'user' }) : null;
  const isLiquid = RATE_UNITS.find((u) => u.unit === unit)?.measure === 'volume';

  const areaOptions = [
    ...s.areas.filter((a) => a.sizeM2).map((a) => ({ value: a.id, label: `${a.name} · ${Math.round(a.sizeM2!)} m²` })),
    { value: MANUAL, label: 'Enter size' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: space.sm }}>
          <FieldLabel label="Area" />
          <ChipGroup label="Area" options={areaOptions} value={areaChoice} onChange={setAreaChoice} />
          {areaChoice === MANUAL ? <Field label="Area size" value={manualArea} onChangeText={setManualArea} keyboardType="decimal-pad" suffix="m²" /> : null}
        </View>

        <Field
          label="Label rate"
          hint="Copy the rate from your product label for the use you’re applying it for."
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          placeholder="e.g. 25"
        />
        <ChipGroup label="Rate unit" options={RATE_UNITS.map((u) => ({ value: u.unit, label: u.label }))} value={unit} onChange={setUnit} />

        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Text variant="overline" color="textMuted">
            Product needed
          </Text>
          <Text variant="display" style={{ fontSize: 44, lineHeight: 52 }} accessibilityLiveRegion="polite">
            {result ? result.text : '—'}
          </Text>
          <Text variant="caption" color={error ? 'danger' : 'textMuted'} style={{ textAlign: 'center' }}>
            {error ?? (result ? `${result.workings}. Rate entered by you.` : 'Enter an area and a label rate.')}
          </Text>
        </Card>

        {isLiquid ? (
          <Banner
            tone="neutral"
            title="Product only"
            body="This is the amount of product, not the water. How much water to mix it with depends on your sprayer’s measured coverage, which this version doesn’t calculate yet."
          />
        ) : null}
        <Text variant="caption" color="textMuted">
          This is arithmetic, not advice. Always follow the product label for rates, timing and safety.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
