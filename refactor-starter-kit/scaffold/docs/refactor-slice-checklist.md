# Refactor Slice Checklist

Use this checklist for each bounded-context slice.

## 1. Plan the slice

- Define the context boundary (auth/orders/payments/etc.).
- Confirm compatibility constraints (routes, payloads, behavior).
- Decide what remains untouched in this PR.

## 2. Extract in safe order

- Move side effects and external integrations into services first.
- Move orchestration and state flow into controller hooks next.
- Convert root app/page/router file into a thin composition shell.

## 3. Protect architecture

- Keep direct network calls behind shared API wrappers.
- Keep shared contracts/types/errors in shared packages.
- Keep temporary file-size exceptions explicit and time-boxed.

## 4. Add focused tests

- Domain/application tests for extracted modules.
- Router/composition wiring tests.
- Regression tests for high-risk behavior.

## 5. Validate and hand off

- Run full validation matrix.
- Update playbook status and next slice.
- Document remaining risks and rollback path.
