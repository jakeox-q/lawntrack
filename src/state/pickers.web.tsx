/**
 * Browser preview of the native pickers: a sheet with the browser's own date or
 * time input. Same promise API as pickers.tsx.
 */
import { createContext, createElement, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { radius, space, typography } from '@/constants/theme';
import type { LocalDate, LocalTime } from '@/domain/dates';
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

interface Request {
  mode: 'date' | 'time';
  title: string;
  value: string;
  min?: string;
  max?: string;
  resolve: (v: string | null) => void;
}

const Ctx = createContext<Pickers | null>(null);

export function usePickers(): Pickers {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePickers must be used inside PickerProvider');
  return v;
}

export function PickerProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [request, setRequest] = useState<Request | null>(null);
  const [draft, setDraft] = useState('');
  const resolved = useRef(false);

  const open = useCallback((r: Request) => {
    resolved.current = false;
    setDraft(r.value);
    setRequest(r);
  }, []);

  const pickers = useMemo<Pickers>(
    () => ({
      pickDate: (o) => new Promise((resolve) => open({ mode: 'date', title: o.title, value: o.value, min: o.min, max: o.max, resolve })),
      pickTime: (o) => new Promise((resolve) => open({ mode: 'time', title: o.title, value: o.value, resolve })),
    }),
    [open],
  );

  const finish = (value: string | null) => {
    if (request && !resolved.current) {
      resolved.current = true;
      request.resolve(value);
    }
    setRequest(null);
  };

  const valid = request?.mode === 'date' ? /^\d{4}-\d{2}-\d{2}$/.test(draft) : /^\d{2}:\d{2}$/.test(draft);

  return (
    <Ctx.Provider value={pickers}>
      {children}
      <Modal visible={!!request} transparent animationType="fade" onRequestClose={() => finish(null)}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} onPress={() => finish(null)} accessibilityLabel="Close" />
        <View style={styles.center} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <Text variant="title" accessibilityRole="header">
              {request?.title}
            </Text>
            {request
              ? createElement('input', {
                  type: request.mode,
                  value: draft,
                  min: request.min,
                  max: request.max,
                  step: request.mode === 'time' ? 300 : undefined,
                  'aria-label': request.title,
                  onChange: (e: { target: { value: string } }) => setDraft(e.target.value.slice(0, request.mode === 'time' ? 5 : 10)),
                  style: {
                    ...typography.headline,
                    fontFamily: 'inherit',
                    padding: 12,
                    borderRadius: radius.md,
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                    background: theme.background,
                    colorScheme: 'light dark',
                  },
                })
              : null}
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button label="Cancel" variant="secondary" onPress={() => finish(null)} style={{ flex: 1 }} />
              <Button label="Done" disabled={!valid} onPress={() => finish(draft)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg },
  sheet: { width: '100%', maxWidth: 420, borderRadius: radius.lg, padding: space.xl, gap: space.lg },
});
