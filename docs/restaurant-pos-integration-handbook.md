# Websys POS Integration Handbook

## Purpose

This guide defines the supported `ClockIn` integration surface for Websys POS tenants. The goal is to give the POS team one stable contract for:

- schedule management
- hours reporting
- payroll reporting
- tip reporting
- daily expense reporting (`payouts`)
- optional payout writeback

Use the RestaurantPOS integration API instead of calling raw app endpoints directly. The owner-side tenant profile is labeled `Websys POS Tenant`.

Owner-side setup:

- In `Owner > Tenant Accounts`, create the tenant with the `Websys POS Tenant` profile.
- That profile keeps `Reports Enabled` and `Daily Sales Reporting` on by default so the POS integration has the required reporting surface.

## Base URL

```text
https://api.websysclockin.com/api/integrations/restaurant-pos
```

For local or private environments, replace the hostname with your API base URL.

## Required POS-side configuration

Websys POS should store these values in its integration settings:

- `apiBaseUrl`
  - Example: `https://api.websysclockin.com/api`
- `tenantExternalId`
  - This must be the ClockIn tenant external identifier (`authOrgId`), not the tenant display name.
- `actorName`
  - Service identity used for the integration request. Example: `admin` or `Websys POS`.
- `actorEmail`
  - Service identity email for the integration request.
- `actorId`
  - Stable service actor ID. Example: `pos-integration`.
- `officeId`
  - Optional default location scope for hours/tips/schedules. Leave blank for tenant-wide access when allowed.

## Authentication

### Current supported mode

The current POS-safe mode matches the existing internal integration pattern.

Send these headers when the ClockIn API is running with `DEV_BYPASS_AUTH=true`:

```http
x-dev-tenant-id: <tenantExternalId>
x-dev-user-id: <actorId>
x-dev-name: <actorName>
x-dev-email: <actorEmail>
```

### Recommended production hardening

For long-term production rollout, move the POS integration to one of these:

1. POS backend obtains a real service token and sends `Authorization: Bearer <token>`
2. ClockIn issues a tenant-scoped integration credential with revocation and audit support

Do not make browser clients call ClockIn directly with privileged headers. Keep the POS browser talking to the POS backend.

## Scope rules

These rules are intentional and should be preserved in the POS implementation:

- `hours`, `payroll`, `tips`, and `schedules` can be filtered by `officeId`
- `payouts` / daily expenses are tenant-wide and do not support location scoping
- manager-scoped accounts are automatically restricted to their assigned location
- tenant admins and parent admins can operate tenant-wide unless they choose an `officeId`

## Bootstrap / connection check

### `GET /connection`

Use this first to validate auth, tenant mapping, office scope, and feature availability.

Query params:

- `officeId` optional

Example:

```bash
curl -H "x-dev-tenant-id: maya" \
  -H "x-dev-user-id: pos-integration" \
  -H "x-dev-name: Websys POS" \
  -H "x-dev-email: pos@clockin.local" \
  "https://api.websysclockin.com/api/integrations/restaurant-pos/connection?officeId=<officeId>"
```

Response shape:

```json
{
  "provider": "clockin",
  "configured": true,
  "tenant": {
    "id": "tenant_uuid",
    "name": "CasaGroup",
    "slug": "casagroup",
    "tenantExternalId": "maya"
  },
  "actor": {
    "actorType": "tenant_admin",
    "displayName": "admin",
    "membershipRole": "ADMIN",
    "authUserId": "pos-integration",
    "userId": "user_uuid",
    "allowedOfficeId": null
  },
  "settings": {
    "websysPosEnabled": true,
    "multiLocationEnabled": true,
    "companyOrdersEnabled": true,
    "liquorInventoryEnabled": true,
    "premiumFeaturesEnabled": true
  },
  "capabilities": {
    "scheduleManagement": true,
    "hoursReporting": true,
    "payrollReporting": true,
    "tipReporting": true,
    "payoutReporting": true,
    "payoutWriteback": true
  },
  "resolvedScope": {
    "requestedOfficeId": "optional_office_uuid",
    "officeId": "resolved_office_uuid_or_null",
    "expensesScope": "tenant"
  },
  "permissions": {
    "reports": true,
    "schedules": true,
    "salesCapture": true
  },
  "offices": [
    {
      "id": "office_uuid",
      "name": "MayaOfdepere",
      "latitude": null,
      "longitude": null,
      "geofenceRadiusMeters": null
    }
  ],
  "integrationNotes": [
    "Use tenantExternalId as the tenant identifier; do not send the display name.",
    "Owner-created Websys POS tenants keep reports and daily sales reporting enabled by default.",
    "Hours, payroll, tips, and schedules can be office-filtered when an officeId is provided.",
    "Payouts/daily expenses are tenant-wide and ignore office filtering."
  ]
}
```

## Hours reporting

### `GET /workforce/hours`

Query params:

- `from` required `YYYY-MM-DD`
- `to` required `YYYY-MM-DD`
- `round` optional, one of `0,5,10,15,20,30`
- `tzOffset` optional integer minutes
- `employeeId` optional
- `officeId` optional
- `groupId` optional

Response highlights:

- `employees[].employeeId`
- `employees[].name`
- `employees[].totalMinutes`
- `employees[].totalHoursDecimal`
- `employees[].totalHoursFormatted`
- `employees[].shifts`
- `employees[].days[]` optional detail rows

## Payroll reporting

### `GET /workforce/payroll`

Query params:

- everything from hours report, plus:
- `weekStartsOn` optional `0|1`
- `overtimeThreshold` optional hours, default `40`

Response highlights:

- `totals.totalHoursDecimal`
- `totals.totalPay`
- `employees[].hourlyRate`
- `employees[].totalPay`
- `employees[].weeks[]`

## Tip reporting

### `GET /workforce/tips`

Query params:

- `from` required
- `to` required
- `employeeId` optional
- `officeId` optional
- `groupId` optional

Response highlights:

- `totals.cashTips`
- `totals.creditCardTips`
- `totals.totalTips`
- `employees[].cashTips`
- `employees[].creditCardTips`
- `employees[].totalTips`

## Today schedule board

### `GET /workforce/schedules/today`

Query params:

- `officeId` optional

Response highlights:

- `date`
- `weekday`
- `weekdayLabel`
- `timezone`
- `rows[].employeeId`
- `rows[].employeeName`
- `rows[].startTime`
- `rows[].endTime`
- `rows[].officeName`
- `rows[].groupName`
- `rows[].roleLabel`

## Employee schedule detail

### `GET /workforce/schedules/:employeeId`

Response highlights:

- `editable`
- `employeeId`
- `employeeName`
- `days[]` with `weekday`, `label`, `enabled`, `startTime`, `endTime`

## Employee schedule update

### `PUT /workforce/schedules/:employeeId`

Body:

```json
{
  "days": [
    {
      "weekday": 1,
      "enabled": true,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

Notes:

- send 1 to 7 rows
- `weekday` must be `0..6`
- disabled days can omit `startTime` and `endTime`
- accepted times are normalized by ClockIn

## Payouts / daily expense reporting

### `GET /payouts`

Query params:

- `from` required
- `to` required

Important:

- payouts are tenant-wide
- do not expect `officeId` filtering here

Response highlights:

- `scope: "tenant"`
- `totals.totalExpenses`
- `totals.cashExpenses`
- `totals.debitCardExpenses`
- `totals.checkExpenses`
- `payouts[]`

Each payout row includes:

- `payoutId`
- `expenseId`
- `date`
- `vendor`
- `companyName`
- `paymentMethod`
- `invoiceNumber`
- `amount`
- `checkNumber`
- `payToCompany`
- `hasReceipt`
- `notes`
- `submittedBy`
- `submittedAt`

## Optional payout writeback

### `POST /payouts`

Body:

```json
{
  "date": "2026-03-12",
  "companyName": "Sysco",
  "paymentMethod": "CHECK",
  "amount": 128.45,
  "invoiceNumber": "INV-2044",
  "checkNumber": "100221",
  "payToCompany": "Sysco",
  "notes": "Vendor payout from POS"
}
```

Rules:

- `paymentMethod` must be `CHECK`, `DEBIT_CARD`, or `CASH`
- `CHECK` requires `invoiceNumber`, `checkNumber`, and `payToCompany`
- writeback requires ClockIn `salesCapture` access

## Client package

The repository now includes a reusable client package for this integration:

- `/Users/elmerperez/Desktop/clockin/clockin/packages/restaurant-pos-client`

Main exports:

- `createRestaurantPosClient`
- `buildRestaurantPosDevHeaders`
- `useRestaurantPosConnection`
- `useRestaurantPosHoursReport`
- `useRestaurantPosPayrollReport`
- `useRestaurantPosTipsReport`
- `useRestaurantPosTodaySchedules`
- `useRestaurantPosEmployeeSchedule`
- `useRestaurantPosPayoutsReport`
- `useRestaurantPosScheduleMutation`
- `useRestaurantPosCreatePayoutMutation`

## Recommended POS integration pattern

1. POS backend owns ClockIn credentials / dev headers
2. POS frontend calls POS backend only
3. POS backend calls ClockIn integration endpoints
4. POS frontend uses the client package types so payloads stay consistent

## Field mapping advice for Websys POS

Use this mapping in the POS configuration UI:

- `tenant name` in the UI should actually store `tenantExternalId`
- `location` in the UI should store ClockIn `officeId`
- `service user` should map to `actorId` / `actorName` / `actorEmail`
- validate everything through `/connection` before enabling the integration

## Operational advice

1. Keep one service identity per POS deployment so audit trails stay readable.
2. Cache `/connection` briefly in the POS backend; do not call it on every browser render.
3. Treat `officeId` as optional. Only send it when the POS register is tied to one location.
4. Do not assume payouts are location-scoped.
5. If a manager-level integration account is used, expect automatic office restriction.
6. Plan a production auth upgrade away from `x-dev-*` headers before broad rollout.
