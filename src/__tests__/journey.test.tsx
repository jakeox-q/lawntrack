/**
 * Renders the real app routes against an in-memory database and walks the core
 * journey: onboarding → first reminder → permission → Today → mark done → undo.
 */
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

const Notifications = jest.requireMock('expo-notifications');
const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
afterEach(() => {
  // Any alert during the journey means a save failed.
  expect(alertSpy.mock.calls).toEqual([]);
});

it('takes a new user from sign-up-free onboarding to a scheduled, completable reminder', async () => {
  renderRouter('src/app', { initialUrl: '/' });

  // Step 1: lawn
  expect(await screen.findByText('Let’s set up your lawn')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Size'), '120');
  fireEvent.press(screen.getByRole('button', { name: 'Next' }));

  // Step 2: first reminder (defaults: mowing, every 2 weeks after it's done, starting today)
  expect(await screen.findByText('Your first reminder')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Create reminder' }));

  // Step 3: permission, asked only after a reminder exists
  expect(await screen.findByText('Get a nudge on the day')).toBeTruthy();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Allow notifications' }));

  // Today (the test renderer mounts every tab, so Plan shows the same task)
  expect(await screen.findByText('Up next')).toBeTruthy();
  expect(screen.getAllByText('Due today').length).toBeGreaterThan(0);
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByRole('button', { name: 'Mark done' }));
  expect(await screen.findByText(/^Done · next /)).toBeTruthy();
  await waitFor(() => expect(screen.queryAllByText('Due today')).toHaveLength(0));
  expect(screen.getAllByText('Mowed').length).toBeGreaterThan(0); // History entry

  // The next occurrence (two weeks out) is handed to the OS with the action buttons.
  await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
  const request = Notifications.scheduleNotificationAsync.mock.calls.at(-1)[0];
  expect(request.identifier).toMatch(/^lt:/);
  expect(request.content.categoryIdentifier).toBe('lawn-task');
  expect(request.trigger.date).toBeGreaterThan(Date.now() + 12 * 86_400_000);

  // Undo puts it back and removes the history entry.
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  await waitFor(() => expect(screen.getAllByText('Due today').length).toBeGreaterThan(0));
  expect(screen.queryAllByText('Mowed')).toHaveLength(0);

  // Snooze from the task screen moves the alert, keeps the job due today, and confirms.
  fireEvent.press(screen.getByRole('button', { name: 'Options' }));
  fireEvent.press(await screen.findByRole('radio', { name: 'Remind tomorrow' }));
  expect(await screen.findByText('Reminder moved to tomorrow')).toBeTruthy();
  expect(screen.getAllByText(/reminder snoozed to/).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Due today').length).toBeGreaterThan(0);
});
