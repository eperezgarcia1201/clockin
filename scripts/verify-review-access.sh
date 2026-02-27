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
REQUIRED_USERS_CSV="${REQUIRED_USERS_CSV:-reviewemployee,reviewserver,reviewmanager,reviewkitchen}"
MIN_SCHEDULE_DAYS="${MIN_SCHEDULE_DAYS:-7}"

echo "==> Verifying tenant directory resolve"
resolve_payload="$(curl -fsS "${API_URL}/tenant-directory/resolve?tenant=${TENANT}")"
tenant_id="$(jq -r '.id // empty' <<<"${resolve_payload}")"
tenant_name="$(jq -r '.name // empty' <<<"${resolve_payload}")"
tenant_slug="$(jq -r '.slug // empty' <<<"${resolve_payload}")"
tenant_auth_org_id="$(jq -r '.authOrgId // empty' <<<"${resolve_payload}")"
tenant_active="$(jq -r '.isActive // false' <<<"${resolve_payload}")"

if [[ -z "${tenant_id}" || -z "${tenant_slug}" || -z "${tenant_auth_org_id}" ]]; then
  echo "Tenant resolve did not return id/slug/authOrgId. Payload:" >&2
  echo "${resolve_payload}" >&2
  exit 1
fi
if [[ "${tenant_active}" != "true" ]]; then
  echo "Tenant is not active (isActive=${tenant_active})." >&2
  exit 1
fi
echo "Tenant OK: ${tenant_name} (${tenant_slug})"

echo "==> Verifying admin login"
admin_payload="$(curl -fsS -X POST "${API_URL}/tenant-directory/admin-login" \
  -H "Content-Type: application/json" \
  --data "$(jq -cn --arg tenant "${TENANT}" --arg username "${ADMIN_USER}" --arg password "${ADMIN_PASSWORD}" '{tenant:$tenant,username:$username,password:$password}')")"
login_type="$(jq -r '.loginType // empty' <<<"${admin_payload}")"

if [[ "${login_type}" != "tenant_admin" ]]; then
  echo "Admin login failed or unexpected role (loginType=${login_type}). Payload:" >&2
  echo "${admin_payload}" >&2
  exit 1
fi
echo "Admin login OK: ${ADMIN_USER} (${login_type})"

echo "==> Verifying employee records and schedules"
employees_payload="$(curl -fsS "${API_URL}/employees" \
  -H "x-dev-user-id: tenant-admin:${ADMIN_USER}" \
  -H "x-dev-tenant-id: ${tenant_auth_org_id}" \
  -H "x-dev-email: ${ADMIN_USER}@clockin.local" \
  -H "x-dev-name: ${ADMIN_USER}")"

if [[ "$(jq -r 'has("employees")' <<<"${employees_payload}")" != "true" ]]; then
  echo "Employees payload missing .employees array. Payload:" >&2
  echo "${employees_payload}" >&2
  exit 1
fi

IFS=',' read -r -a required_users <<<"${REQUIRED_USERS_CSV}"
for username in "${required_users[@]}"; do
  trimmed="$(echo "${username}" | xargs)"
  if [[ -z "${trimmed}" ]]; then
    continue
  fi
  record_count="$(
    jq -r --arg user "${trimmed}" '
      [
        .employees[]
        | select((.id // "") == $user or ((.name // "") | ascii_downcase) == ($user | ascii_downcase))
      ]
      | length
    ' <<<"${employees_payload}"
  )"
  if [[ "${record_count}" -lt 1 ]]; then
    echo "Missing required employee user: ${trimmed}" >&2
    exit 1
  fi

  schedule_days="$(
    jq -r --arg user "${trimmed}" '
      [
        .employees[]
        | select((.id // "") == $user or ((.name // "") | ascii_downcase) == ($user | ascii_downcase))
        | .scheduleRecordCount // 0
      ]
      | max // 0
    ' <<<"${employees_payload}"
  )"
  if [[ "${schedule_days}" -lt "${MIN_SCHEDULE_DAYS}" ]]; then
    echo "User ${trimmed} has only ${schedule_days} schedule day(s), expected >= ${MIN_SCHEDULE_DAYS}." >&2
    exit 1
  fi
done

echo
echo "Review users snapshot:"
jq -r '
  .employees[]
  | select(
      ((.id // "") == "reviewemployee")
      or ((.id // "") == "reviewserver")
      or ((.id // "") == "reviewmanager")
      or ((.id // "") == "reviewkitchen")
      or ((.name // "") == "reviewemployee")
      or ((.name // "") == "reviewserver")
      or ((.name // "") == "reviewmanager")
      or ((.name // "") == "reviewkitchen")
    )
  | [.id, .name, (.scheduleRecordCount // 0 | tostring), (.isManager | tostring), (.isServer | tostring), (.isKitchenManager | tostring)]
  | @tsv
' <<<"${employees_payload}" | awk 'BEGIN {print "id\tname\tscheduleDays\tisManager\tisServer\tisKitchenManager"} {print}'

echo
echo "PASS: reviewer access checks are valid for tenant ${TENANT}."
