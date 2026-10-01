import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DialogHost } from '@/components/dialog';
import { Toast } from '@/components/toast';
import { Button, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import { migrate } from '@/data/migrations';
import { useTheme } from '@/hooks/use-theme';
import { AppDataProvider, useAppData } from '@/state/app-data';
import { PickerProvider } from '@/state/pickers';

SplashScreen.preventAutoHideAsync().catch(() => {});

async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="lawntrack.db" onInit={initDatabase}>
        <AppDataProvider>
          <PickerProvider>
            <Navigation />
          </PickerProvider>
        </AppDataProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

function Navigation() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const { snapshot, error, refresh } = useAppData();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (snapshot || error) SplashScreen.hideAsync().catch(() => {});
  }, [snapshot, error]);

  if (error && !snapshot) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg, backgroundColor: theme.background }}>
        <Text variant="title">Your lawn data couldn’t be opened</Text>
        <Text color="textMuted">{error.message}</Text>
        <Button label="Try again" onPress={refresh} />
      </View>
    );
  }
  if (!snapshot) return null;

  const modal = { presentation: 'modal' as const, headerShadowVisible: false };
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, primary: theme.primary, background: theme.background, card: theme.background, text: theme.text, border: theme.border },
      }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerTintColor: theme.primary, headerTitleStyle: { color: theme.text }, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="log" options={{ ...modal, title: 'Log lawn work' }} />
        <Stack.Screen name="task/[id]" options={{ title: '' }} />
        <Stack.Screen name="series/new" options={{ ...modal, title: 'New reminder' }} />
        <Stack.Screen name="series/[id]" options={{ title: 'Edit reminder' }} />
        <Stack.Screen name="activity/[id]" options={{ ...modal, title: 'Edit entry' }} />
        <Stack.Screen name="area/[id]" options={{ ...modal, title: 'Lawn area' }} />
        <Stack.Screen name="calculator" options={{ title: 'Product calculator' }} />
        <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
      </Stack>
      <Toast />
      <DialogHost />
    </ThemeProvider>
  );
}
