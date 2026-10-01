/**
 * Confirmation dialogs. Phones use the platform alert; the browser preview, where
 * React Native's Alert does nothing, gets an equivalent in-app dialog.
 */
import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { radius, space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

let listener: ((r: DialogRequest | null) => void) | null = null;

export function showDialog(title: string, message?: string, buttons: DialogButton[] = [{ text: 'OK' }]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons.map((b) => ({ text: b.text, style: b.style, onPress: () => void b.onPress?.() })));
    return;
  }
  listener?.({ title, message, buttons });
}

/** Renders dialogs in the browser preview. Mount once at the root. */
export function DialogHost() {
  const theme = useTheme();
  const [request, setRequest] = useState<DialogRequest | null>(null);

  useEffect(() => {
    listener = setRequest;
    return () => {
      listener = null;
    };
  }, []);

  if (Platform.OS !== 'web' || !request) return null;
  const cancel = request.buttons.find((b) => b.style === 'cancel');
  const close = (b?: DialogButton) => {
    setRequest(null);
    void b?.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close(cancel)}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} onPress={() => close(cancel)} accessibilityLabel="Close" />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.box, { backgroundColor: theme.surface }]} accessibilityRole="alert">
          <Text variant="title">{request.title}</Text>
          {request.message ? <Text color="textMuted">{request.message}</Text> : null}
          <View style={{ gap: space.sm }}>
            {[...request.buttons]
              .sort((a, b) => (a.style === 'cancel' ? 1 : 0) - (b.style === 'cancel' ? 1 : 0))
              .map((b) => (
                <Button
                  key={b.text}
                  label={b.text}
                  variant={b.style === 'destructive' ? 'danger' : b.style === 'cancel' ? 'secondary' : 'primary'}
                  onPress={() => close(b)}
                />
              ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg },
  box: { width: '100%', maxWidth: 420, borderRadius: radius.lg, padding: space.xl, gap: space.md },
});
