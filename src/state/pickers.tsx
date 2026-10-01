/**
 * Promise-based native date and time pickers: `const d = await pickDate({...})`.
 * Android uses the system dialog; iOS shows the inline calendar in a bottom sheet.
 */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { radius, space } from '@/constants/theme';
import { dateToLocalDate, type LocalDate, localDateToDate, type LocalTime } from '@/domain/dates';
import { useTheme } from '@/hooks/use-theme';

interface DateOptions {
  title: string;
  value: LocalDate;
  min?: LocalDate;
  max?: LocalDate;
}

interface TimeOptions {
  title: string;
  value: LocalTime;
}

interface Pickers {
  pickDate(o: DateOptions): Promise<LocalDate | null>;
  pickTime(o: TimeOptions): Promise<LocalTime | null>;
}

const Ctx = createContext<Pickers | null>(null);

export function usePickers(): Pickers {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePickers must be used inside PickerProvider');
  return v;
}

function timeToDate(t: LocalTime): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(d: Date): LocalTime {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type Request =
  | { mode: 'date'; title: string; value: Date; min?: Date; max?: Date; resolve: (d: Date | null) => void }
  | { mode: 'time'; title: string; value: Date; resolve: (d: Date | null) => void };

export function PickerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [draft, setDraft] = useState<Date>(new Date());
  const resolved = useRef(false);

  const open = useCallback((r: Request) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: r.value,
        mode: r.mode,
        is24Hour: false,
        minimumDate: r.mode === 'date' ? r.min : undefined,
        maximumDate: r.mode === 'date' ? r.max : undefined,
        onChange: (event, date) => r.resolve(event.type === 'set' && date ? date : null),
      });
      return;
    }
    resolved.current = false;
    setDraft(r.value);
    setRequest(r);
  }, []);

  const pickers = useMemo<Pickers>(
    () => ({
      pickDate: (o) =>
        new Promise((resolve) =>
          open({
            mode: 'date',
            title: o.title,
            value: localDateToDate(o.value),
            min: o.min ? localDateToDate(o.min) : undefined,
            max: o.max ? localDateToDate(o.max) : undefined,
            resolve: (d) => resolve(d ? dateToLocalDate(d) : null),
          }),
        ),
      pickTime: (o) =>
        new Promise((resolve) =>
          open({ mode: 'time', title: o.title, value: timeToDate(o.value), resolve: (d) => resolve(d ? dateToTime(d) : null) }),
        ),
    }),
    [open],
  );

  const finish = (value: Date | null) => {
    if (request && !resolved.current) {
      resolved.current = true;
      request.resolve(value);
    }
    setRequest(null);
  };

  return (
    <Ctx.Provider value={pickers}>
      {children}
      {Platform.OS === 'ios' ? (
        <IosSheet request={request} draft={draft} onDraft={setDraft} onCancel={() => finish(null)} onDone={() => finish(draft)} />
      ) : null}
    </Ctx.Provider>
  );
}

function IosSheet({
  request,
  draft,
  onDraft,
  onCancel,
  onDone,
}: {
  request: Request | null;
  draft: Date;
  onDraft: (d: Date) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!request} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} onPress={onCancel} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + space.lg }]}>
        <Text variant="title" accessibilityRole="header">
          {request?.title}
        </Text>
        {request ? (
          <DateTimePicker
            value={draft}
            mode={request.mode}
            display={request.mode === 'date' ? 'inline' : 'spinner'}
            minimumDate={request.mode === 'date' ? request.min : undefined}
            maximumDate={request.mode === 'date' ? request.max : undefined}
            accentColor={theme.primary}
            minuteInterval={request.mode === 'time' ? 5 : undefined}
            onChange={(_, d) => d && onDraft(d)}
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button label="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
          <Button label="Done" onPress={onDone} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
});
