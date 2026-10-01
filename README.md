# Lawntrack

A native iOS and Android app for home lawn enthusiasts. Its job is to show what the lawn needs next, send a reminder on the day, and keep a record of what was done. "Lawntrack" is a working title.

- Product vision: [docs/lawn-care-app-plan.md](docs/lawn-care-app-plan.md)
- First build brief: [docs/build-review.md](docs/build-review.md)
- Review of both, with recommended changes: [docs/plan-review.md](docs/plan-review.md)

## Status

The first milestone is built: the local reminder-to-history journey, stored on the phone.

It has not yet been run on a physical device. Everything below the "Verified" heading was checked in a cloud environment without a simulator.

### What works

- **Onboarding in three steps.** Name the lawn, with optional size and grass type. Create one reminder. Allow notifications, which is asked only after a reminder exists.
- **Today.** The next job with one-tap done, upcoming jobs, and quick logging.
- **Plan.** Every reminder grouped by overdue, next seven days, later and paused.
- **History.** Everything done, by month, with edit, backdate and delete.
- **My lawn.** Lawn areas, the product calculator and reminder settings.
- **Three repeat types.** "After I do it" counts from the real completion date. "Set dates" keeps a fixed rhythm. "Just once" covers one-off jobs like equipment hire.
- **Reminder controls.** Done, done on another day, snooze, move date, skip, pause and resume. Undo is offered after done, log and skip.
- **Notifications.** These carry "Mark done" and "Remind me tomorrow" buttons. A test notification is available, and the app shows permission status with a route back to system settings.
- **Calculator.** Multiplies area by the rate the user copied from the label, and shows the working.

### Deliberately not in this milestone

Accounts and sync, map measuring, photos, product catalogue, problem solver, remote content, weather, ads and partner offers. See [docs/plan-review.md](docs/plan-review.md) for the order these come in.

## Rules the code enforces

These come from the plan and are covered by tests in `src/__tests__`.

- **One open job per reminder.** Missed work never piles up into a backlog. The database enforces this with a unique index.
- **Done twice still means one record.** A repeated tap or a notification action racing the screen creates one history entry and one next date.
- **Snooze moves the alert, not the job.** The due date and history are untouched.
- **Skipping never counts as doing the job.** For "after I do it" reminders, skipping asks for the next date or pauses.
- **Backdating can't drag the schedule backwards.** An older entry never overrides a later real completion.
- **Editing or deleting the latest entry recalculates the next date.** If nothing has changed since, deleting reopens the job.
- **Dates are lawn-local.** Due dates are calendar dates in the lawn's time zone. Reminder times survive daylight-saving changes.
- **History keeps what was used.** Each entry stores the product and rate it was done with, so editing the reminder later doesn't rewrite the past.
- **The app never suggests a product rate or interval.** Every rate shown is labelled as entered by the user.

## Running it

Requires Node 22 or later.

```bash
npm install
npx expo run:android      # or: npx expo run:ios (macOS with Xcode)
```

Reminders must be tested in a development build on a real phone, not in a browser. Without a local Android Studio or Xcode, build in the cloud with an Expo account:

```bash
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

### Checks

```bash
npm run check     # typecheck, lint and all tests
npm test          # tests only
```

## Verified

| Check | Result |
|---|---|
| Unit and repository tests on real SQLite | 52 pass |
| Rendered journeys through the real screens | 2 pass |
| TypeScript and ESLint | clean |
| Metro production bundles for iOS and Android | build |
| Expo config plugins and dependency checks | pass, except two checks that need blocked network access |

The rendered journeys cover onboarding, the first reminder, permission granted and declined, mark done, undo and snooze. Native modules are mocked in those tests, so they don't prove notification delivery.

## Device test checklist

Run this on one iPhone and one Android phone before building further. Record what each platform does.

1. Fresh install, then onboarding. Time how long it takes to reach the first reminder.
2. Create a reminder a few minutes ahead. Lock the phone and wait for it.
3. Use "Mark done" from the notification with the app closed. Confirm the toast and undo.
4. Use "Remind me tomorrow" from the notification. Confirm the job stays due today.
5. Decline notifications. Confirm Today still shows the plan and the banner leads to settings.
6. Revoke permission in system settings, return to the app, then restore it.
7. Restart the phone. Confirm scheduled reminders still arrive.
8. Leave the app unopened for a week with several reminders set.
9. Turn on the largest text size and check every screen. Check readability outdoors in sunlight.
10. Change the phone's time zone and check the warning on the Reminders screen.

## Code layout

```
src/
  app/            Screens (Expo Router). (tabs)/ holds Today, Plan, History, My lawn
  components/     UI kit, forms and task rows
  constants/      Theme tokens (colours, type, spacing)
  data/           SQLite migrations, row types and the repository
  domain/         Pure logic: dates, scheduling, calculator, notification planning
  notifications/  The bridge to the operating system's notifications
  state/          App data provider and native pickers
  __tests__/      Logic, repository and rendered-screen tests
```

The database is the source of truth. After every change the app works out which alerts should exist and reconciles the operating system's schedule to match. It also does this whenever the app comes to the foreground, which recovers from dropped or stale alerts.

## Browser preview

```bash
npm run web       # http://localhost:8081
```

The browser preview runs the same screens, rules and SQLite database as the phone app. Data stays in that browser. Notifications only work in the phone builds, so the preview skips the permission step and says so on Today. `metro.config.js` adds the headers SQLite needs in the browser.
