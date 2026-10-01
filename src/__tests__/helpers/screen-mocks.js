/* Mocks for rendering real screens in Jest: an in-memory database, and stand-ins
   for native modules that have no JS implementation in the test environment. */
jest.mock('expo-sqlite', () => {
  const React = require('react');
  const { createTestDb } = require('./node-db');
  const db = createTestDb();
  return {
    SQLiteProvider: ({ children, onInit }) => {
      const [ready, setReady] = React.useState(false);
      React.useEffect(() => {
        onInit(db).then(() => setReady(true));
      }, [onInit]);
      return ready ? children : null;
    },
    useSQLiteContext: () => db,
  };
});

jest.mock('expo-notifications', () => {
  let granted = false;
  return {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    setNotificationCategoryAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(async () => ({ granted, status: granted ? 'granted' : 'undetermined', canAskAgain: true })),
    requestPermissionsAsync: jest.fn(async () => {
      granted = true;
      return { granted: true, status: 'granted', canAskAgain: true };
    }),
    getAllScheduledNotificationsAsync: jest.fn(async () => []),
    scheduleNotificationAsync: jest.fn(async () => 'id'),
    cancelScheduledNotificationAsync: jest.fn(async () => {}),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    getLastNotificationResponseAsync: jest.fn(async () => null),
    clearLastNotificationResponseAsync: jest.fn(async () => {}),
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
    DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  };
});

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'Australia/Sydney' }] }));

