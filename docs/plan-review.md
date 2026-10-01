# Plan review: go, with six changes

Reviewed 1 October 2026 against `lawn-care-app-plan.md`, `build-review.md` and the founder's two original prompts.

## Verdict

The plan is sound and the build review's scope cut is the right one. Execute it. The first milestone, the local reminder-to-history journey, is now built in this repository (see the README).

Six things need to change or be decided before beta. They are ordered by how much they affect the build.

## 1. Accounts at launch pull the backend forward

The founder wants Google, Apple and email sign-in at launch. Sign-in without backup gives users nothing in return for the extra step: they will expect their history to follow them to a new phone. Treat "accounts" as sign-in plus backup and sync, delivered together.

That makes "Backend and admin platform" a decision for the next milestone, not a later one.

**Recommendation: Supabase.**

- Its auth supports Google, Sign in with Apple and passwordless email codes, which is exactly the launch requirement.
- Postgres with row-level security covers sync, export and deletion.
- Its storage covers progress photos later.
- Its table editor can serve as the first content admin, so no custom admin site is needed for beta.
- A Supabase connector is already available in this workspace.

The local database was built for this. Every row has a UUID, `updated_at` and soft deletes, so sync can be added without reshaping data.

Two store rules make parts of the plan mandatory rather than "before public release":

- **Sign in with Apple.** Apple requires it, or an equivalent privacy-focused option, on iOS whenever Google sign-in is offered.
- **In-app account deletion.** Apple rejects apps that create accounts without a way to delete them from inside the app.

Keep the sign-in screen to three buttons and go straight to the three-step onboarding. Measure time from install to first reminder.

## 2. "Update without a release" needs two mechanisms, not one

The plan describes remote content well: products, guides and schedule templates fetched, validated and cached. It doesn't name the second mechanism the founder asked for.

- **EAS Update** ships JavaScript and UI fixes over the air within store rules. This is how copy, layout and logic bugs get fixed without a store review. It needs a runtime version policy set before the first store build.
- **Remote content** covers products, rates and guides as versioned data. This is what the admin workflow in the plan feeds.

New native capabilities still need a store release. The plan already says this.

## 3. Correct the competitor attribution

The plan says the home-screen web app inspected during research was Lawn Tips, and warns against assuming it was LawnHub's. The founder's second prompt says directly that LawnHub's app is the poorly built web app saved to the home screen.

Record the founder's own experience as founder feedback about LawnHub. The research note about Lawn Tips can stay alongside it. The lesson is the same either way: useful answers, poor native experience.

## 4. Ship launch without product advice

Australian lawn chemicals carry legally binding label directions. The plan already refuses AI-generated rates and requires a qualified reviewer for published advice. That reviewer, and supplier permission to reuse content, are the slowest dependencies in the plan.

Launch can succeed on tracking alone: reminders, logging, history and a calculator that uses the rate the user copies from their label. This build does exactly that and never suggests a rate or interval for a product. Add reviewed product content when the reviewer is in place, rather than letting it hold the launch.

## 5. Budget for store onboarding time

- **Google Play.** New personal developer accounts must run a closed test with at least 12 testers for 14 continuous days before production access. The planned beta of 15 to 25 users covers this only if it runs through the Play closed testing track. An organisation account avoids the rule but needs a D-U-N-S number.
- **Apple.** The developer program is a paid annual membership. TestFlight external testing needs a short beta review.
- **Identity.** Bundle identifiers need a reverse-domain name you control. "Lawntrack" is a working title; check store and trademark availability before branding.

## 6. Keep ads out of launch

Banner ads bring an ad SDK, a consent prompt, extra privacy disclosures and visual clutter. All of these work against the "slick, proper app" goal. The plan's revenue order is right: no ads at launch, affiliate links once retention is proven, and a remove-ads purchase only if ads are ever introduced. Full-screen ads stay excluded permanently.

## Smaller notes

- **Notification limits.** iOS keeps at most 64 pending local notifications per app. The build schedules the soonest 48 and refills every time the app opens, which is ample for lawn care.
- **Notification actions.** "Mark done" and "Remind me tomorrow" open the app so the change is saved and shown with an undo option. Completing silently in the background would need a background task. It isn't worth that complexity before device testing.
- **Mapping.** Polygon area can be calculated on the device, so no paid geometry service is needed. Google Maps needs an API key with billing on both platforms, while Apple Maps on iOS doesn't. Run a short tracing spike on real phones before choosing.
- **Onboarding.** The plan's eight steps are now three: lawn, first reminder, notification permission. Products, history and location are asked for when a feature needs them.
- **Plan status lines.** Both documents said a build and README already existed when the repository was empty. That is now true.

## Next milestones

1. **Device trial.** Make development builds with EAS, then exercise reminders on a real iPhone and Android phone using the checklist in the README. Record what each platform does.
2. **Accounts and sync.** Sign-in screen, first-sign-in upload of local data, row-level sync with soft deletes, export, in-app account deletion.
3. **Content and updates.** Reviewed product catalogue, remote content with local cache and version checks, EAS Update channels.
4. **Mapping spike**, then the measuring feature.
5. **Beta.** TestFlight and the Play closed track with 15 to 25 testers, store listings and privacy disclosures.
