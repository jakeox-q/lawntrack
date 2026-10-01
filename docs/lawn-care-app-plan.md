# Lawn care app plan

Updated: 1 October 2026
Status: Product vision. First functional Expo build started on 1 October 2026; see README.md for implemented scope and launch gaps.

## Product promise

Know what your lawn needs next, remember when to do it, and keep track of what you have done.

Build a polished mobile app for Australian home lawn enthusiasts, starting with beginners. Release through the Apple App Store and Google Play Store. The core experience must use native mobile UI, rather than a website saved to the home screen or a website wrapped in an app shell.

## Product direction

- Reminders and fast activity logging are the main benefits.
- Support products from several brands, including user-entered products.
- Help beginners understand problems through reviewed, structured answers.
- Keep tasks, calculations and saved instructions available offline.
- Keep routine tracking free.
- Product information and learning content must be editable without an app release.
- No full-screen ads, forced video ads or ads during active lawn tasks.

Reference suppliers: https://lawnhub.com.au/ and https://lawntips.net/

Research clarification: the home-screen app inspected during planning was Lawn Tips. The user's feedback describes the referenced web-app experience as poorly presented. Do not assume which supplier owns a particular app without checking.

Lawn Tips already advertises a journal, calculators, problem solving and satellite measurement. These features are useful references, but the proposed advantage is polished mobile UX, simple onboarding, cross-brand support and reminders that respond to real activity.

## First-release audience and scope

- Australian homeowners with one property.
- Separate front, back and verge lawn areas.
- Beginners and enthusiasts who own products but struggle to track timing.
- Grass type can be known or unknown.
- Advice content should cover only reviewed grass types, regions and products.

Do not claim complete support for all climates or products at launch.

## Core navigation

| Tab | Purpose |
|---|---|
| Today | Next task, upcoming work and quick logging |
| Plan | Calendar or list of tasks and reminder settings |
| History | Completed activities and progress photos |
| My lawn | Lawn areas, products, equipment and access to help |

Calculations and relevant instructions appear inside each task. Help can open a problem-solving flow without adding another main tab.

## Onboarding

Launch starts with a minimal sign-in screen: Google, email code and Apple on iOS. New accounts go directly to onboarding; returning users retain their session. No separate registration form or required password.

1. Enter suburb or postcode. Exact street address is optional except when locating a lawn on a map.
2. Add grass type, with an “I am not sure” option.
3. Name lawn areas and enter their sizes manually or on a map.
4. Select products already owned or add a custom product.
5. Enter last application dates, with an unknown-date option.
6. Choose preferred lawn-care days, reminder time and notification style.
7. Review and approve the first tasks.
8. Request notification permission after the first reminder is created.

Allow skipped steps and later editing. Never interpret an unknown last application as proof that another application is due now.

## First-release features

### Lawn profiles

- Name, grass type, area, photos and optional notes.
- Separate zones with different products or schedules.
- Manual area entry as a fallback to mapping.

### Activity history

Track mowing, granular fertiliser, liquid fertiliser, pre-emergent, weed treatment, wetting agents, scarifying, dethatching, aerating, coring, topdressing, seeding and custom activities.

Quick logging should take one or two taps. Date defaults to today. Product, quantity, mowing height, photos and notes remain optional where appropriate. Allow backdating, editing and undo.

Preserve the product rate and content version used for a completed application. Later catalogue changes must not rewrite historical records.

### Product shelf

- Products owned and optional pack quantity.
- Brand, exact formulation, category and label link.
- Reviewed products clearly distinguished from user-entered products.
- Saved rates only where the relevant use has been selected.
- Custom products supported without invented advice.
- Supplier purchase links optional and labelled when commercial.

### Reminders

Support four types:

| Type | Behaviour |
|---|---|
| Fixed date | Keep a selected date, such as equipment hire |
| After completion | Calculate the next task from the actual completion date |
| Seasonal window | Prompt within a reviewed window and ask the user to confirm |
| Follow-up | Inspect or photograph the result after a completed task |

Controls:

- Done, snooze, reschedule and skip.
- Completed earlier with date selection.
- Quiet hours, preferred days and holiday pause.
- Weekly digest or individual reminders.
- Separate preferences for mowing and product applications.
- Preview of the next reminder and a test notification.
- Visible notification permission status and help restoring permissions.

Scheduling rules:

- Delayed completion moves completion-based repeats.
- Fixed dates remain fixed unless edited.
- Snoozing an alert does not record completion.
- Skipping does not create an application record.
- Missed tasks never accumulate duplicate application instructions.
- Editing or deleting a task cancels its old notification.
- Backdated activity recalculates linked future tasks.
- Display a due window when the date is flexible.
- Explain why a reminder is due and whether its interval is user-selected or reviewed.
- Device and cloud scheduling must avoid sending the same reminder twice.
- Handle daylight-saving changes and the property's timezone explicitly.

### Application calculator

- Select lawn area and the relevant product use.
- Show rate, source and units alongside the result.
- Calculate product quantity from area.
- Separate product quantity from carrier water.
- For liquids, use calibrated coverage and sprayer capacity to calculate tanks and the final partial tank.
- Do not infer coverage from tank volume alone.
- Do not suggest tank mixtures without reviewed compatibility information.

Fictional arithmetic example: 120 m² at 25 g/m² requires 3 kg. This is a calculation example, not an application recommendation.

### Lawn measurement

- Satellite map with editable polygon points.
- Separate polygons for each lawn zone.
- Exclusions for garden beds, paths and other non-lawn areas.
- Save estimated area and allow a measured value to override it.
- Reject invalid or overlapping geometry that would double-count area.
- Keep mapping optional and show that satellite-derived measurements are estimates.

### Progress photos

- Dated photos attached to an area or activity.
- Simple chronological view.
- Add comparison views after validating demand.

### Beginner problem solver

Use a short, structured flow: grass type → observed problem → clarifying questions → reviewed possible causes → next checks or relevant guide.

Provide plain-language explanations, source links and clear next actions. An answer may help create a task, but must not automatically schedule chemical treatment from a vague symptom.

Start with a small reviewed set of common issues. Do not launch with unrestricted AI diagnosis or generated chemical rates. Learn from suppliers' useful workflows while writing original content or securing permission to reuse it.

## Design requirements

- Native mobile navigation and controls.
- Readable outdoors, with sufficient contrast and large touch targets.
- Short forms, sensible defaults and optional detail.
- Clear empty states and progress through onboarding.
- Accessible text sizing and screen-reader labels.
- Consistent spacing, typography, icons and motion.
- Fast feedback when logging work, with an undo option.
- No shopping prompt blocking a calculation or task.
- Review visual design before building all screens.

## Technical direction

Proposed, subject to a technical trial:

- React Native, Expo and TypeScript for Android and iOS.
- Local database for offline activity, task and content access.
- Hosted database, authentication and photo storage for backup and sync.
- Separate browser-based admin interface for managing content.
- Map provider selected after testing mobile tracing, imagery and usage costs.
- Local scheduled notifications for ordinary reminders.
- Server notifications reserved for features requiring fresh server information.

Do not choose a browser-only architecture for the core app.

## Updating information without releases

Separate app behaviour from published content.

| Change | Delivery route |
|---|---|
| Product descriptions, labels and reviewed rates | Versioned content published through admin |
| Guides and problem-solving answers | Versioned content published through admin |
| Reviewed schedule templates | Supported structured data fetched by app |
| Partner links and discounts | Admin-managed content |
| New native capability, permission or incompatible data format | New app build and store release |

Content publishing workflow:

1. Draft content or correction.
2. Review rates and advice with a qualified lawn specialist.
3. Preview and validate required fields and units.
4. Publish a version with reviewer, source and date.
5. App fetches compatible updates and caches them locally.
6. Retain rollback and audit history.

Critical rate changes must be visible when a future task is opened. Do not silently rewrite a user's schedule. Previously completed applications keep their historical data.

The app must remain usable if content refresh fails. Code updates are a separate decision and must follow store policies. Remote content is not a substitute for app releases when functionality changes.

## Core records

- Property and lawn zones.
- Product catalogue and owned products.
- Product uses, rates and content versions.
- Activity records and photos.
- Task series and individual task occurrences.
- Reminder preferences and device notification identifiers.
- Reviewed guides and problem-solving flows.
- Partner offers and affiliate attribution.

Keep task plans separate from completed activity. Add user data access controls, export and account deletion before public release.

## Revenue

Preferred sequence:

1. Optional affiliate reorder links.
2. Negotiated partner discounts.
3. Small labelled sponsor placements outside task workflows.
4. Optional remove-ads purchase if ads are introduced.
5. Paid extras only after evidence of demand.

Keep basic logging, reminders and calculations free. Affiliate commission and customer discounts require separate partner agreements. Do not let commercial ranking override product suitability.

Illustrative scenario only: 2,000 monthly active users × 5% purchasing × $100 average order × 5% commission = $500 monthly gross affiliate revenue before costs.

Giveaways and trade promotions are a later business project, not a dependency for launch. Their rules and viability need separate review before proceeding.

## Build stages and acceptance criteria

### Stage 1: Design and technical trial

- Design onboarding, Today, task detail, logging and reminders.
- Test reminder delivery and actions on real Android and iOS devices.
- Demonstrate offline logging and one calculation.
- Test mobile polygon tracing.
- Confirm that a content correction reaches the app without a new build.

Exit: a coherent design and a proven technical path for the main benefits.

### Stage 2: Working beta

- Build core navigation, lawn areas, product shelf, activities and reminders.
- Add calculator, progress photos and a small reviewed help library.
- Add content administration, backup and sync.
- Test with the founder's lawn and approximately 15–25 users.

Exit: users can set up, receive reminders, complete or postpone tasks, and retain records across sessions and devices without duplicates or lost work.

### Stage 3: Public release

- Finish satellite mapping if not completed in beta.
- Resolve usability and reliability issues from testing.
- Complete accessibility, data export and deletion.
- Add approved catalogue content and one optional partner offer.
- Prepare store listings, screenshots, privacy disclosures and support contact.
- Distribute beta builds, then submit store releases through owner accounts.

Exit: core journeys pass on both platforms and the owner approves the release.

### Later candidates

Weather-aware suggestions, reviewed seasonal programmes, guided renovations, sprayer calibration tools, stock estimates, progress comparisons, soil-test records and paid extras.

## Meaningful verification

- Reminder permission denied, restored and revoked.
- App closed, device restarted and offline use.
- Snooze, skip, backdate, edit and delete.
- Timezones and daylight-saving changes.
- Calculation units, rounding and partial tanks.
- Invalid polygons, exclusions and manual area overrides.
- Sync conflicts and repeated completion actions.
- Content correction, rollback and incompatible versions.
- Readability outdoors and larger text sizes.

Do not promise that operating systems will always deliver an alert. Keep upcoming and overdue work visible inside the app.

## Validation measures

- First reminder created.
- First and second activities logged.
- Return use after four and eight weeks.
- Task completion, snooze and dismissal patterns.
- Setup abandonment and requests for help.
- Partner-link conversion only after retention is established.

## Decisions still open

- App name and visual identity.
- Initial supported grass types, products and regions.
- Expert content reviewer and supplier permissions.
- Backend and admin platform.
- Map provider and costs.
- Launch account requirement decided: Google, passwordless email and Apple on iOS; a single sign-in flow creates or restores the account and leads directly into onboarding. Development preview is separate from release access.
- Budget, team capacity and release dates.
- Exact commercial arrangements.

## Recommended next action

Design the core mobile flows first, then build a thin working version that proves onboarding → first reminder → notification → completed activity → next due date. Establish a Git repository before sustained app development.

## Reference material

- LawnHub: https://lawnhub.com.au/
- Lawn Tips app: https://lawntips.net/pages/lawn-tips-app
- Expo notifications: https://docs.expo.dev/push-notifications/what-you-need-to-know/
- Google Maps geometry: https://developers.google.com/maps/documentation/javascript/geometry

Source pages were consulted during planning. Supplier participation and content rights have not been agreed.
