import { Alert, Linking, View } from 'react-native';

import { TimeChoice } from '@/components/choices';
import { Banner, Button, Card, FieldLabel, Row, Screen, Section, Text } from '@/components/ui';
import { space } from '@/constants/theme';
import { instantToLocalDate, instantToLocalTime } from '@/domain/dates';
import { formatDate, formatTime } from '@/domain/format';
import { sendTestNotification } from '@/notifications/native';
import { useAppData, useSnapshot } from '@/state/app-data';

export default function RemindersScreen() {
  const s = useSnapshot();
  const { permission, requestPermission, lastSync, act, deviceZone, showToast, refresh } = useAppData();
  const granted = permission?.state === 'granted';
  const next = lastSync?.next;

  return (
    <Screen>
      {granted ? (
        <Banner tone="primary" icon={{ ios: 'bell.fill', android: 'notifications' }} title="Reminders are on" body="You’ll get a notification at each reminder’s time." />
      ) : (
        <Banner
          tone="accent"
          icon={{ ios: 'bell.slash.fill', android: 'notifications_off' }}
          title="Reminders are off"
          body={
            permission?.canAskAgain
              ? 'Allow notifications to get a nudge on the day.'
              : 'Notifications are turned off for this app in your phone’s settings.'
          }
          action={
            permission?.canAskAgain ? (
              <Button compact label="Allow notifications" onPress={requestPermission} />
            ) : (
              <Button compact variant="secondary" label="Open phone settings" onPress={() => Linking.openSettings()} />
            )
          }
        />
      )}

      <Section title="Status">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text>Open jobs</Text>
            <Text variant="headline">{s.tasks.length}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text>Alerts scheduled on this phone</Text>
            <Text variant="headline">{granted && lastSync && !lastSync.blocked ? lastSync.total - lastSync.failed : 0}</Text>
          </Row>
          {granted && next ? (
            <Text variant="caption" color="textMuted">
              Next: {next.title}, {formatDate(instantToLocalDate(next.fireAt, s.timeZone), s.today)} at{' '}
              {formatTime(instantToLocalTime(next.fireAt, s.timeZone))}
            </Text>
          ) : null}
          {lastSync && lastSync.failed > 0 ? (
            <Text variant="caption" color="danger">
              {lastSync.failed} alert{lastSync.failed === 1 ? '' : 's'} couldn’t be scheduled. They’ll be retried next time you open the app.
            </Text>
          ) : null}
          <Text variant="caption" color="textMuted">
            Jobs that are already overdue don’t send another alert, but they stay on the Today screen until you deal with them.
          </Text>
        </Card>
        <Button
          variant="secondary"
          label="Send a test notification"
          disabled={!granted}
          onPress={async () => {
            try {
              await sendTestNotification(5);
              showToast('Test sent · it arrives in 5 seconds');
            } catch {
              Alert.alert('Couldn’t send a test', 'Check that notifications are allowed for this app.');
            }
          }}
        />
        <Button variant="ghost" compact label="Re-check reminders" onPress={refresh} />
      </Section>

      <Section title="Defaults">
        <TimeChoice
          label="Default time for new reminders"
          value={s.settings.reminderTime}
          onChange={async (t) => {
            await act((r) => r.setDefaultReminderTime(t));
          }}
        />
      </Section>

      <Section title="Time zone">
        <Card>
          <FieldLabel label={s.timeZone.replace(/_/g, ' ')} hint="Due dates and reminder times use your lawn’s time zone." />
          {deviceZone !== s.timeZone ? (
            <View style={{ gap: space.sm }}>
              <Text variant="caption" color="accent">
                Your phone is set to {deviceZone.replace(/_/g, ' ')}.
              </Text>
              <Button compact variant="secondary" label="Use phone’s time zone" onPress={() => act((r) => r.setTimeZone(deviceZone))} />
            </View>
          ) : null}
        </Card>
      </Section>

      <Text variant="caption" color="textMuted">
        Phones decide when notifications are delivered and battery savers can delay them. Everything due always shows on the Today
        screen.
      </Text>
    </Screen>
  );
}
