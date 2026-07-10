#!/bin/bash
# ============================================================
# TISSAGE — Enregistrement du GitLab Runner
# ============================================================
# Usage :
#   export GITLAB_URL="http://192.168.10.62:8080"
#   export REGISTRATION_TOKEN="votre_token"
#   bash register-runner.sh
# ============================================================

set -euo pipefail

GITLAB_URL="${GITLAB_URL:-http://192.168.10.62:8080}"
REGISTRATION_TOKEN="${REGISTRATION_TOKEN:?Erreur: REGISTRATION_TOKEN non défini}"
RUNNER_NAME="${RUNNER_NAME:-tissage-runner}"
RUNNER_TAG_LIST="${RUNNER_TAG_LIST:-dev,staging,production,monitoring}"
RUNNER_EXECUTOR="${RUNNER_EXECUTOR:-docker}"
RUNNER_DOCKER_IMAGE="${RUNNER_DOCKER_IMAGE:-alpine:latest}"

echo "=== Enregistrement du Runner: ${RUNNER_NAME} ==="
echo "URL: ${GITLAB_URL}"
echo "Executor: ${RUNNER_EXECUTOR}"
echo "Tags: ${RUNNER_TAG_LIST}"

docker exec tissage-runner gitlab-runner register \
  --non-interactive \
  --url "${GITLAB_URL}" \
  --registration-token "${REGISTRATION_TOKEN}" \
  --name "${RUNNER_NAME}" \
  --tag-list "${RUNNER_TAG_LIST}" \
  --executor "${RUNNER_EXECUTOR}" \
  --docker-image "${RUNNER_DOCKER_IMAGE}" \
  --docker-volumes "/var/run/docker.sock:/var/run/docker.sock" \
  --docker-privileged \
  --docker-network-mode "tissage-net" \
  --run-untagged="true" \
  --locked="false"

echo "✓ Runner enregistré avec succès"
