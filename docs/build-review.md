# Plan review and first build brief

Reviewed: 1 October 2026
Status: First implementation underway. The owner subsequently required accounts for launch; Google/email/Apple sign-in replaces guest-first release access.

## Assessment

The product plan is a sound direction. Its strongest choices are reminders based on actual work, quick logging, cross-brand products, offline use and clear separation between published content and app functionality. These directly address the founder's problem.

Keep the original plan as the product vision. Treat the decisions below as proposed implementation defaults rather than previously approved requirements. The workspace currently contains the plan only and has no Git repository or app scaffold.

## Tighten the scope

The listed first release is too broad for the first working build. Mapping, product advice, diagnosis, cloud sync and an admin interface each introduce substantial work. Prove one complete journey first:

Create a lawn area → create a mowing reminder → receive an alert → log completion → see history and the next due date.

Then repeat the journey for a user-entered product with an explicitly entered rate and interval. A user-entered rate is not reviewed advice.

The first installable prototype should include:

- A development preview for local testing. Launch requires a simple Google/email/Apple sign-in followed directly by onboarding (owner clarification after this review).
- Lawn areas with manual square-metre entry and optional grass type.
- Today, Plan, History and My lawn navigation.
- Quick activity logging, editing and undo.
- Fixed-date and completion-based tasks.
- Reminder permissions, test notification, snooze, reschedule and skip.
- Offline persistence.
- A basic area × rate calculator with explicit units and input provenance.

Defer satellite measurement, photos, seasonal advice, diagnosis, accounts, sync, ads and partner offers until this journey works well. Keep these in the product roadmap. Manual area entry lets the core benefit work before a map provider is chosen.

## Reduce onboarding

The eight-step flow risks delaying the first useful result. Start with lawn name, optional size and one task. Ask for notification permission after the user chooses its reminder. Gather products, last applications, grass type and location when those features need them.

Unknown application dates should lead to a user-chosen first date or a request to check records, never an automatic chemical application recommendation.

## Specify scheduling before coding

- Store the lawn's IANA timezone and local due date separately from timestamps for completed events. A date such as 10 October is not midnight UTC.
- Keep the task's due date separate from its next alert time. Snoozing changes the alert, not the activity record or repeat interval.
- Completion-based repeats use calendar-day arithmetic from the actual completion date. They produce one next occurrence rather than a backlog of missed applications.
- For fixed-date series, skipping dismisses that occurrence and keeps the later dates. For completion-based series, skipping asks the user to select the next date or pause the series; it must not imply completion.
- Define what happens when multiple activities match a task. Only explicitly linked completions recalculate that series.
- Backdating an older activity must not overwrite a later linked completion. Editing or deleting the latest linked activity recomputes the next task from the remaining valid history.
- Completing the same occurrence twice creates one activity and one successor. Use stable occurrence identifiers and database transactions.
- Persist desired reminder state first, then reconcile operating-system notifications. Recover from scheduling failure, stale identifiers and interrupted updates on app launch.
- Schedule within platform limits and test what happens after a prolonged period without opening the app. Do not assume background execution will replenish reminders.
- Before sync ships, choose whether alerts appear on all devices or one selected device. Local/server deduplication alone does not solve duplicate alerts across two phones.

## Technical recommendation

Use React Native, Expo and TypeScript for the initial technical trial, with Expo SQLite for local storage and Expo Notifications for alerts. React Native renders platform-backed UI components; a polished app still requires deliberate design, accessible controls and device testing.

Use development builds early and release builds for final notification checks. A browser preview cannot validate the main benefit. Expo documents local scheduling, notification actions and permissions, including Android exact-time constraints. Lawn-care reminders should not promise alarm-clock precision.

Keep scheduling and calculator logic independent of screens so their behaviour can be tested directly. Use versioned database migrations from the first persisted build.

Start content with a bundled, versioned data file and a defined schema. Prove a compatible remote content correction in the technical trial; an elaborate admin interface is not necessary for that proof. Add publishing, review and rollback tooling before externally reviewed advice reaches public users.

Backend selection can wait until the local journey works. Before implementing sync, define conflict handling, deletion propagation, guest-to-account migration and recovery/export. Local prototype data has no cloud backup; make that visible.

## Design and validation gates

First review onboarding, Today, task detail, quick log and reminder settings as one coherent flow. Avoid building every screen before the visual direction is reviewed.

The prototype is ready for founder testing when:

1. A user can create an area and their first reminder without browsing a product catalogue.
2. A completion survives restart and offline use and produces the correct next date.
3. Snooze, skip, backdate, edit, delete and repeated taps have the specified outcomes.
4. Notification permission denial leaves a useful in-app plan.
5. Notification actions and delivery have been exercised on real iOS and Android devices, with platform limitations recorded.
6. Unit conversions and calculator rounding pass meaningful examples; liquid tank calculations wait for calibrated coverage inputs.
7. Large text and outdoor readability have been checked.

After that, add reviewed products and content updates, then photos and backup/sync. Test mapping separately before selecting its provider. Add a small reviewed help library before public release if review capacity exists.

## Commercial and content priorities

Retention comes before advertising. Launch founder testing without ads. Affiliate links are a later experiment once partner terms exist; they are not a reason to delay reminders and logging.

A calculator needs more than a rate field once reviewed products are introduced: exact formulation, relevant use, grass restrictions, units, source, content version and applicable label limits. Record those facts rather than deriving treatment schedules from a generic product category. Qualified content review remains a dependency for published application advice, not for generic tracking.

Lawn Tips currently advertises a journal, calculators, diagnosis and satellite measurement, and gives home-screen installation instructions. This supports the plan's competitor reference but does not establish that the founder's earlier experience was with Lawn Tips rather than LawnHub. Avoid attributing that feedback without confirmation.

## Evidence checked

- [React Native core and native components](https://reactnative.dev/docs/intro-react-native-components)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Lawn Tips app](https://lawntips.net/pages/lawn-tips-app)

## Next implementation milestone

Establish Git, scaffold the Expo TypeScript app, define the visual direction and build the local reminder-to-history journey. Use a working title until branding is chosen. No supplier agreement, commercial backend or map account is required to start this milestone.
