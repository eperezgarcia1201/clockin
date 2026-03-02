# Refactor Starter Kit

Reusable starter kit for large refactors with strict guardrails and safe handoffs.

## What is included

- `scaffold/scripts/check-max-lines.mjs`: fails when files exceed max line caps.
- `scaffold/scripts/check-no-direct-fetch.mjs`: blocks direct network calls in UI layers.
- `scaffold/guardrails.config.json`: include/exclude rules, temporary overrides, and expiry dates.
- `scaffold/.github/workflows/refactor-guardrails.yml`: CI template for chunk-by-chunk validation.
- `scaffold/.github/pull_request_template.md`: PR checklist for refactor slices.
- `scaffold/docs/refactor-playbook.md`: living migration playbook template.
- `scaffold/docs/refactor-slice-checklist.md`: bounded-context extraction checklist.
- `scaffold/package.scripts.snippet.json`: scripts to merge into your root `package.json`.

## Quick start

1. Copy everything under `scaffold/` into the root of the target app/repo.
2. Merge script entries from `package.scripts.snippet.json` into your root `package.json`.
3. Update `guardrails.config.json` include/exclude patterns and `allowIn` API wrapper paths.
4. Tighten max line caps and remove overrides as slices are extracted.
5. Add the workflow template into the target repo's active `.github/workflows/` directory.
6. Use the playbook template to track current slice, risks, and next extraction.

## Validation cadence (per chunk)

Run after each extraction chunk:

1. Build backend and frontend apps.
2. Run type checks for mobile apps.
3. Run `check:lines` and `check:no-direct-fetch`.
4. Run backend module and router wiring tests.
5. Update playbook status before opening the PR.

## Notes

- Use temporary line overrides only when actively shrinking legacy files.
- Add `expiresOn` to every override to force cleanup.
- Keep root app/page/router files as thin composition shells.
