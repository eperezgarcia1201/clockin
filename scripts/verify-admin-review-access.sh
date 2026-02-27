#!/usr/bin/env bash

set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

API_URL="${API_URL:-https://api.websysclockin.com/api}"
TENANT="${TENANT:-apple-review-demo}"
ADMIN_USER="${ADMIN_USER:-reviewadmin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-1234qwer}"
MANAGER_USER="${MANAGER_USER:-reviewmanager}"
MANAGER_PASSWORD="${MANAGER_PASSWORD:-3333}"
MIN_MANAGER_SCHEDULE_DAYS="${MIN_MANAGER_SCHEDULE_DAYS:-7}"

echo "==> Verifying tenant directory resolve"
resolve_payload="$(curl -fsS "${API_URL}/tenant-directory/resolve?tenant=${TENANT}")"
tenant_name="$(jq -r '.name // empty' <<<"${resolve_payload}")"
tenant_slug="$(jq -r '.slug // empty' <<<"${resolve_payload}")"
tenant_auth_org_id="$(jq -r '.authOrgId // empty' <<<"${resolve_payload}")"
tenant_active="$(jq -r '.isActive // false' <<<"${resolve_payload}")"

if [[ -z "${tenant_slug}" || -z "${tenant_auth_org_id}" ]]; then
  echo "Tenant resolve missing slug/authOrgId." >&2
  echo "${resolve_payload}" >&2
  exit 1
fi
if [[ "${tenant_active}" != "true" ]]; then
  echo "Tenant is not active (isActive=${tenant_active})." >&2
  exit 1
fi
echo "Tenant OK: ${tenant_name} (${tenant_slug})"

echo "==> Verifying tenant admin login"
admin_payload="$(curl -fsS -X POST "${API_URL}/tenant-directory/admin-login" \
  -H "Content-Type: application/json" \
  --data "$(jq -cn --arg tenant "${TENANT}" --arg username "${ADMIN_USER}" --arg password "${ADMIN_PASSWORD}" '{tenant:$tenant,username:$username,password:$password}')")"
admin_login_type="$(jq -r '.loginType // empty' <<<"${admin_payload}")"

if [[ "${admin_login_type}" != "tenant_admin" ]]; then
  echo "Admin login failed (loginType=${admin_login_type}). Payload:" >&2
  echo "${admin_payload}" >&2
  exit 1
fi
echo "Admin login OK: ${ADMIN_USER} (${admin_login_type})"

echo "==> Verifying manager fallback login"
manager_payload="$(curl -fsS -X POST "${API_URL}/tenant-directory/admin-login" \
  -H "Content-Type: application/json" \
  --data "$(jq -cn --arg tenant "${TENANT}" --arg username "${MANAGER_USER}" --arg password "${MANAGER_PASSWORD}" '{tenant:$tenant,username:$username,password:$password}')")"
manager_login_type="$(jq -r '.loginType // empty' <<<"${manager_payload}")"
manager_employee_id="$(jq -r '.managerEmployeeId // empty' <<<"${manager_payload}")"

if [[ "${manager_login_type}" != "manager" || -z "${manager_employee_id}" ]]; then
  echo "Manager fallback login failed (loginType=${manager_login_type}). Payload:" >&2
  echo "${manager_payload}" >&2
  exit 1
fi
echo "Manager login OK: ${MANAGER_USER} (${manager_login_type})"

echo "==> Verifying manager record and schedule"
employees_payload="$(curl -fsS "${API_URL}/employees" \
  -H "x-dev-user-id: tenant-admin:${ADMIN_USER}" \
  -H "x-dev-tenant-id: ${tenant_auth_org_id}" \
  -H "x-dev-email: ${ADMIN_USER}@clockin.local" \
  -H "x-dev-name: ${ADMIN_USER}")"

manager_schedule_days="$(
  jq -r --arg user "${MANAGER_USER}" '
    [
      .employees[]
      | select((.name // "") == $user or (.id // "") == $user)
      | .scheduleRecordCount // 0
    ]
    | max // 0
  ' <<<"${employees_payload}"
)"

if [[ "${manager_schedule_days}" -lt "${MIN_MANAGER_SCHEDULE_DAYS}" ]]; then
  echo "Manager user ${MANAGER_USER} has ${manager_schedule_days} schedule day(s), expected >= ${MIN_MANAGER_SCHEDULE_DAYS}." >&2
  exit 1
fi

echo "Manager schedule OK: ${manager_schedule_days} day(s)"
echo
echo "PASS: admin reviewer access checks are valid for tenant ${TENANT}."
