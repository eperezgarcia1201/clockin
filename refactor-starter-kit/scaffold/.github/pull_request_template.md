## Refactor Slice Summary

Describe the bounded context extracted in this PR.

## Scope

- Context:
- Old surface still preserved:
- New module boundaries:

## Guardrails

- [ ] `check:lines` passes
- [ ] `check:no-direct-fetch` passes
- [ ] Temporary line-limit overrides were reduced or removed
- [ ] Any new override has `reason` and `expiresOn`

## Validation Matrix

- [ ] Backend build
- [ ] Frontend build
- [ ] Mobile typecheck
- [ ] Mobile admin typecheck
- [ ] Backend tests (targeted modules + router wiring)

## Compatibility

- [ ] Existing routes remain stable
- [ ] Existing payloads remain stable
- [ ] Existing behavior remains stable

## Risk Review

- Regression risks:
- Rollback strategy:
- Follow-up slice:
