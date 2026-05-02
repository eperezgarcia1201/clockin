#!/usr/bin/env bash

set -euo pipefail

LOG_FILE="${LOG_FILE:-/var/log/websys-storage-cleanup.log}"
TMP_RETENTION_DAYS="${TMP_RETENTION_DAYS:-3}"
DOCKER_RETENTION_HOURS="${DOCKER_RETENTION_HOURS:-168}"
JOURNAL_RETENTION="${JOURNAL_RETENTION:-7d}"
DOCKER_LOG_MAX_BYTES="${DOCKER_LOG_MAX_BYTES:-52428800}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

prune_temp_dir() {
  local dir="$1"

  if [ -d "$dir" ]; then
    find "$dir" -mindepth 1 -mtime "+${TMP_RETENTION_DAYS}" -print -delete 2>/dev/null | tee -a "$LOG_FILE" >/dev/null || true
  fi
}

rotate_large_docker_logs() {
  local data_root="${1:-/var/lib/docker}"

  if [ -d "$data_root/containers" ]; then
    while IFS= read -r -d '' log_path; do
      log "Truncating oversized Docker log: $log_path"
      truncate -s 0 "$log_path" || true
    done < <(find "$data_root/containers" -type f -name '*-json.log' -size +"${DOCKER_LOG_MAX_BYTES}"c -print0 2>/dev/null)
  fi
}

main() {
  mkdir -p "$(dirname "$LOG_FILE")"
  touch "$LOG_FILE"

  log "Storage cleanup started"
  df -h | tee -a "$LOG_FILE" >/dev/null

  prune_temp_dir /tmp
  prune_temp_dir /var/tmp

  if command -v docker >/dev/null 2>&1; then
    local docker_root
    docker_root="$(docker info --format '{{ .DockerRootDir }}' 2>/dev/null || echo /var/lib/docker)"

    rotate_large_docker_logs "$docker_root"

    docker container prune -f --filter "until=${DOCKER_RETENTION_HOURS}h" >>"$LOG_FILE" 2>&1 || true
    docker image prune -af --filter "until=${DOCKER_RETENTION_HOURS}h" >>"$LOG_FILE" 2>&1 || true
    docker builder prune -af --filter "until=${DOCKER_RETENTION_HOURS}h" >>"$LOG_FILE" 2>&1 || true
    docker network prune -f >>"$LOG_FILE" 2>&1 || true
  fi

  if command -v journalctl >/dev/null 2>&1; then
    journalctl --vacuum-time="$JOURNAL_RETENTION" >>"$LOG_FILE" 2>&1 || true
  fi

  log "Storage cleanup finished"
  df -h | tee -a "$LOG_FILE" >/dev/null
}

main "$@"
