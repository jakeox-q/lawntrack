import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { radius, space, TOUCH } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data';

const VISIBLE_MS = 6000;

/** Confirmation with an undo, shown above the tab bar. */
export function Toast() {
  const { toast, hideToast } = useAppData();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hideToast, toast.undo ? VISIBLE_MS : 3500);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 92 }]}>
      <View
        style={[styles.toast, { backgroundColor: theme.text }]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert">
        <Text variant="label" style={{ color: theme.background, flex: 1 }} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.undo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo"
            disabled={busy}
            onPress={async () => {
              const undo = toast.undo!;
              setBusy(true);
              hideToast();
              try {
                await undo();
              } finally {
                setBusy(false);
              }
            }}
            style={styles.undo}>
            <Text variant="headline" style={{ color: theme.background, textDecorationLine: 'underline' }}>
              Undo
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg },
  toast: {
    borderRadius: radius.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  undo: { minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: space.md, alignItems: 'center', justifyContent: 'center' },
});
