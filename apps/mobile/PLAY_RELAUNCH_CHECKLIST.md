# Employee App Play Relaunch Checklist

Use this list every time before uploading a new employee app build after suspension.

## New app identity (required by Google after suspension)

- Play app name: `ClockIn Employee`
- Android package: `com.websys.clockinemployee`

## Reviewer access (must match App Access exactly)

- Tenant: `apple-review-demo`
- Employee user + PIN: `reviewemployee / 1111`
- Admin user + password: `reviewadmin / 1234qwer`
- Additional users: `reviewserver / 2222`, `reviewmanager / 3333`, `reviewkitchen / 4444`
- Schedules: Sunday-Saturday, `00:00-23:59`

## Pre-submit verification

Run this from repo root:

```bash
bash ./scripts/verify-review-access.sh
```

Expected result: `PASS: reviewer access checks are valid`.

## Build latest Android app bundle (employee app)

```bash
cd apps/mobile
npx eas build --platform android --profile production --non-interactive
```

## Submit AAB to Google Play

```bash
cd apps/mobile
npx eas submit --platform android --profile production --latest --non-interactive
```

If submit fails because the package does not exist yet, create the Play app once in Console with:

- App name: `ClockIn Employee`
- Package: `com.websys.clockinemployee`

Then rerun the submit command.

## Final Play Console checks before sending for review

- `Policy status`: no missing declarations
- `App content -> App access`: credentials above are exact
- `Publishing overview`: click `Send for review`
