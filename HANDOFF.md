# Foldup — handoff

> Written 2026-09-15. **Unverified is UNKNOWN, never a pass** — a green build is
> not a verification. Every row below says what was actually run.

**Foldup** — lift a tile, drop it on its twin.
Plan: `/Volumes/ExtremePro/Dev/next_mobile_apps/PLAN.md` (PLAN.md §3).
Portfolio rules: `Dev/AGENTS.md`, then `Dev/docs/agents/18-app-lifecycle.md`.

## State at a glance

| | |
|---|---|
| Stage | **Feature-complete**, not yet released |
| Tests | 295 passing |
| Device pass | ⬜ never run |
| Released | ⬜ no |

## Verification state

| Gate | State |
|---|---|
| Lint | ✅ |
| Typecheck | ✅ |
| Unit tests (295) | ✅ |
| i18n completeness — 14 locales | ✅ |
| UI rules — colour tokens, `t()` | ✅ |
| iOS + Android bundle export | ✅ |
| CI on a self-hosted runner | 🔨 running when this was written — re-check with `gh run list` |
| `check:release` with real identifiers | ✅ passes in CI |
| Builds / launches on the iOS simulator | ⬜ |
| Interaction driven on the Android emulator | ⬜ |
| Light **and** dark checked on device | ⬜ |
| Purchase flow against a real offering | ⬜ no store product exists yet |
| Ads served under real consent | ⬜ no consent message published yet |

## What is built

**Foldup is feature-complete and every device-free gate is green.**

- Game engines: board rules, clearability search, unmerge-backwards generator
- Screens: level select, play, settings, paywall
- 295 tests, all passing
- Free tier: levels 1-30; 1 hint per level

Run `npm run verify` to re-prove all of it in one command.

## What is left

1. **Device pass** — `npm run verify:device`. **Not yet run for this app.** This is the next step.
2. **Screenshots** — capture from the running app during that device pass. They
   are the one store asset that cannot be produced ahead of time.
3. **Store records** — see "Blocked on a person" below.
4. **Submit** — `npm run build:production` then `npm run submit:production`.

## Identifiers — already provisioned, do not recreate

Changing a bundle id means deleting and recreating the RevenueCat app, which
**invalidates its public SDK keys**. These are settled.

| | |
|---|---|
| Bundle id / package | `com.altixcode.foldup` |
| Scheme | `foldup://` |
| GitHub | `AltixCode/foldup` |
| RevenueCat project | `proj2399cd52` |
| RevenueCat iOS app | `app375efd28de` |
| RevenueCat Android app | `appab72030215` |
| Entitlement | `remove_ads` (`entl14dc19ee60`) |
| Offering / package | `default` (`ofrng4c6a91e8d4`) / `$rc_lifetime` (`pkgefda2b45592`) |
| AdMob app (iOS) | `ca-app-pub-2504845459806550~9388423860` |
| AdMob app (Android) | `ca-app-pub-2504845459806550~1805447313` |
| AdMob banner (iOS / Android) | `ca-app-pub-2504845459806550/9053381944` / `ca-app-pub-2504845459806550/7500627128` |
| AdMob interstitial (iOS / Android) | `ca-app-pub-2504845459806550/8744416873` / `ca-app-pub-2504845459806550/7431335202` |
| AdMob rewarded (iOS / Android) | `ca-app-pub-2504845459806550/1520532972` / `ca-app-pub-2504845459806550/1174891927` |

All ten release identifiers plus `EXPO_TOKEN` are already GitHub repo secrets.
Locally they come from `/Volumes/ExtremePro/Dev/.admob-ids/foldup.env` —
never commit that file.

## Blocked on a person — cannot be scripted

These three have no write API at all. Browser sessions live in the Playwright
MCP profile (`~/Library/Caches/ms-playwright-mcp/`).

1. **App Store Connect record** — the session was expired on 2026-09-15 and
   **needs a sign-in**. Then:
   `asc iris apps create --name "Foldup" --bundle-id com.altixcode.foldup --sku foldup-ios`
   The bundle id is already registered. Everything after the record — IAP,
   pricing, localisations — is scriptable.
2. **Play Console app.** A Play app has **no package name until its first bundle
   is uploaded**, so the order is: create app → upload an AAB to internal testing
   → *then* create the `remove_ads` product. Build that first AAB from a
   **non-production** profile so testers generate no live ad impressions.
3. **AdMob GDPR + US-states consent messages.** The apps and all six ad units
   exist, but **no consent message is published**. The SDK can only present a
   message that exists, and this app fails closed — so in the EEA it currently
   shows **no ads at all**. Publish both under Privacy & messaging.

Also expect **"Requires review — limited ad serving"** on every new AdMob app
for a few days. That is normal, not an integration fault.

## Decisions that are the owner's, not an agent's

- Publish on altixcode.com and itsata.com? **Not yet asked.** Procedure:
  `docs/agents/14-portfolio-demos.md`.
- App Store name. Casual and puzzle names are heavily contested; budget several
  attempts. Apple checks the whole title string, so `Name: Descriptor` often
  clears when the bare name does not. ASC names stay editable until first release.

## Traps already paid for — do not rediscover

- `npm run test:ci` enforces coverage thresholds; a plain `jest` run does not.
  CI has caught this twice.
- **A coverage shortfall in CI may not be about coverage.** Jest's default worker
  count exhausted the shared runner's file descriptors — `ENFILE: file table
  overflow` — and three suites failed to LOAD, so their files went uncovered and
  the job blamed the thresholds. `test:ci` runs `--runInBand` for this reason;
  do not remove it.
- **`package-lock.json` must be committed.** Without it every job dies at
  setup-node with "Dependencies lock file is not found", and `npm ci` cannot run
  at all. Generate one without installing: `npm install --package-lock-only`.
- RNTL 14: `render` and `fireEvent` are async — **await both**. Put each
  screen's tests in its own file, and never call `jest.restoreAllMocks()` in a
  screen test: it restores spies the renderer relies on and the next test's tree
  is torn down as it renders.
- Reset a board by **remounting a keyed component**, never by setState in an
  effect — otherwise one frame shows the previous puzzle on the new board.
- Keep gesture hit-testing on the JS thread. A worklet calling a plain JS helper
  throws *"Tried to synchronously call a Remote Function"* on first touch:
  invisible to Jest, fatal on device.
- `expo run:android` wants the **AVD name**, not the adb serial, and can fail in
  seconds leaving the previous APK installed. Always check its exit code.
- iOS verification stops at build / install / launch / render: Simulator.app is
  missing from this Xcode install, so the ATT prompt cannot be dismissed. **Drive
  interaction on Android.**
- Export `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
  for any Android build, or Gradle silently falls back to JDK 25 and CMake dies.
- Shared code is generated. Fix it in `AltixCode/next-mobile-apps` (`_template/`)
  and re-run `node scripts/bootstrap.mjs foldup`, never in this copy —
  otherwise the next regeneration reverts it.
