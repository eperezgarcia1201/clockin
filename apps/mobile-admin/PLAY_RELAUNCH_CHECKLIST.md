# Admin App Play Relaunch Checklist

Use this checklist before each Google Play submission for the admin app.

## New app identity (required after suspension)

- Play app name: `ClockIn Admin Plus`
- Android package: `com.websys.clockinadminplus`

## Reviewer access (must match App Access exactly)

- Tenant: `apple-review-demo`
- Primary admin login: `reviewadmin / 1234qwer`
- Manager fallback login: `reviewmanager / 3333`

## Pre-submit verification

Run from repo root:

```bash
bash ./scripts/verify-admin-review-access.sh
```

Expected result: `PASS: admin reviewer access checks are valid`.

## Build latest Android app bundle (admin app)

```bash
cd apps/mobile-admin
npx eas build --platform android --profile production
```

## Submit bundle to Google Play

```bash
cd apps/mobile-admin
npx eas submit --platform android --profile production --latest --non-interactive
```

If this is the first upload for the package and submit fails, upload manually in Play Console:

- App name: `ClockIn Admin Plus`
- Package: `com.websys.clockinadminplus`

Then rerun `eas submit` for future releases.

## Final Play Console checks

- `Policy status`: no required items pending
- `App content -> App access`: credentials exactly as listed above
- `Publishing overview`: click `Send for review`
