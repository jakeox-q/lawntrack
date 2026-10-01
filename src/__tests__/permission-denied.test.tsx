/** Declining notifications must still leave a working, visible plan. */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

const Notifications = jest.requireMock('expo-notifications');

it('keeps the plan usable in the app when notifications are declined', async () => {
  Notifications.requestPermissionsAsync.mockImplementation(async () => ({ granted: false, status: 'denied', canAskAgain: false }));
  Notifications.getPermissionsAsync.mockImplementation(async () => ({ granted: false, status: 'denied', canAskAgain: false }));

  renderRouter('src/app', { initialUrl: '/' });
  fireEvent.press(await screen.findByRole('button', { name: 'Next' }));
  fireEvent.press(await screen.findByRole('button', { name: 'Create reminder' }));
  fireEvent.press(await screen.findByRole('button', { name: 'Allow notifications' }));

  expect(await screen.findByText('No problem')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Go to my lawn' }));

  expect(await screen.findByText('Up next')).toBeTruthy();
  expect(screen.getAllByText('Reminders are off').length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: 'Open reminder settings' }).length).toBeGreaterThan(0);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
