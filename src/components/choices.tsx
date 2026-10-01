import { View } from 'react-native';

import { ChipGroup, FieldLabel } from '@/components/ui';
import { space } from '@/constants/theme';
import { addDays, compareDates, type LocalDate, type LocalTime, nextWeekday } from '@/domain/dates';
import { formatDate, formatTime } from '@/domain/format';
import { usePickers } from '@/state/pickers';

const PICK = '__pick__';

/** Quick date chips with a native calendar for anything else. */
export function DateChoice({
  label,
  hint,
  value,
  onChange,
  today,
  direction,
}: {
  label: string;
  hint?: string;
  value: LocalDate;
  onChange: (d: LocalDate) => void;
  today: LocalDate;
  direction: 'past' | 'future';
}) {
  const { pickDate } = usePickers();
  const presets: { value: string; label: string }[] =
    direction === 'past'
      ? [
          { value: today, label: 'Today' },
          { value: addDays(today, -1), label: 'Yesterday' },
          { value: addDays(today, -2), label: '2 days ago' },
        ]
      : [
          { value: today, label: 'Today' },
          { value: addDays(today, 1), label: 'Tomorrow' },
          { value: nextWeekday(today, 6), label: 'Saturday' },
          { value: addDays(today, 7), label: 'In a week' },
        ];
  const unique = presets.filter((p, i) => presets.findIndex((q) => q.value === p.value) === i);
  const isPreset = unique.some((p) => p.value === value);
  const options = [...unique, { value: PICK, label: isPreset ? 'Other date…' : formatDate(value, today) }];

  return (
    <View style={{ gap: space.sm }}>
      <FieldLabel label={label} hint={hint} />
      <ChipGroup
        label={label}
        options={options}
        value={isPreset ? value : PICK}
        onChange={async (v) => {
          if (v !== PICK) return onChange(v);
          const picked = await pickDate({
            title: label,
            value,
            max: direction === 'past' ? today : undefined,
            min: direction === 'future' ? addDays(today, -365) : undefined,
          });
          if (picked && (direction === 'future' || compareDates(picked, today) <= 0)) onChange(picked);
        }}
      />
    </View>
  );
}

const TIMES: LocalTime[] = ['06:00', '07:00', '08:00', '17:00', '18:00'];

export function TimeChoice({ label, hint, value, onChange }: { label: string; hint?: string; value: LocalTime; onChange: (t: LocalTime) => void }) {
  const { pickTime } = usePickers();
  const isPreset = TIMES.includes(value);
  const options = [...TIMES.map((t) => ({ value: t, label: formatTime(t) })), { value: PICK, label: isPreset ? 'Other…' : formatTime(value) }];
  return (
    <View style={{ gap: space.sm }}>
      <FieldLabel label={label} hint={hint} />
      <ChipGroup
        label={label}
        options={options}
        value={isPreset ? value : PICK}
        onChange={async (v) => {
          if (v !== PICK) return onChange(v);
          const picked = await pickTime({ title: label, value });
          if (picked) onChange(picked);
        }}
      />
    </View>
  );
}
