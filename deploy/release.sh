#!/usr/bin/env bash
# Update existing HairRoot resources. The one-time provisioning belongs to deploy.sh.
# Normal release: verify immutable image -> wait for migrations/seed -> update service.
# Rollback: verify old image -> update service without rerunning the migration job.
set -euo pipefail

: "${PROJECT_ID:?Required}"
: "${REGION:?Required}"
: "${IMAGE_TAG:?Required}"

SERVICE_NAME="${SERVICE_NAME:-hairroot}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:-hairroot-migrate}"
ROLLBACK="${ROLLBACK:-false}"
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid image tag.' >&2; exit 1; }
[[ "$ROLLBACK" == true || "$ROLLBACK" == false ]] || { echo 'Invalid rollback mode.' >&2; exit 1; }

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/hairroot/hairroot:${IMAGE_TAG}"
DIGEST_IMAGE="$(gcloud artifacts docker images describe "$IMAGE" \
  --project="$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
EXPECTED_PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/hairroot/hairroot@sha256:"
[[ "$DIGEST_IMAGE" == "$EXPECTED_PREFIX"* ]] || {
  echo 'Image digest was not found in Artifact Registry.' >&2
  exit 1
}

if [[ "$ROLLBACK" == false ]]; then
  # The existing job uses the rerunnable synthetic seed with SEED_RESET unset;
  # it does not delete bookings. A failed job stops this script before service update.
  gcloud run jobs update "$MIGRATE_JOB_NAME" --image="$DIGEST_IMAGE" \
    --project="$PROJECT_ID" --region="$REGION" --quiet >/dev/null
  gcloud run jobs execute "$MIGRATE_JOB_NAME" --wait \
    --project="$PROJECT_ID" --region="$REGION" --quiet >/dev/null
else
  echo 'Rollback requested: migration job will not run.'
fi

RUN_ID="${GITHUB_RUN_ID:-manual}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:-1}"
REVISION_SUFFIX="sha-${IMAGE_TAG:0:12}-${RUN_ID}-${RUN_ATTEMPT}"

# update-env-vars preserves CLIENT_ORIGIN set during provisioning and records
# the full commit SHA on the revision for release evidence.
gcloud run services update "$SERVICE_NAME" --image="$DIGEST_IMAGE" \
  --revision-suffix="$REVISION_SUFFIX" \
  --update-env-vars="DEPLOYED_COMMIT_SHA=${IMAGE_TAG}" \
  --project="$PROJECT_ID" --region="$REGION" --quiet >/dev/null
gcloud run services update-traffic "$SERVICE_NAME" --to-latest \
  --project="$PROJECT_ID" --region="$REGION" --quiet >/dev/null

SERVICE_INFO="$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" --region="$REGION" --format=json)"
SERVICE_URL="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["status"]["url"])' <<<"$SERVICE_INFO")"
DEPLOYED_REVISION="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["status"]["latestReadyRevisionName"])' <<<"$SERVICE_INFO")"

REVISION_INFO="$(gcloud run revisions describe "$DEPLOYED_REVISION" \
  --project="$PROJECT_ID" --region="$REGION" --format=json)"
read -r RUNNING_IMAGE RUNNING_COMMIT < <(python3 deploy/revision_info.py <<<"$REVISION_INFO")

[[ "$RUNNING_IMAGE" == "$DIGEST_IMAGE" ]] || {
  echo "Latest ready revision is not running the deployed image digest (revision reports: '${RUNNING_IMAGE:-none}')." >&2
  exit 1
}
[[ "$RUNNING_COMMIT" == "$IMAGE_TAG" ]] || {
  echo 'Latest ready revision does not record the requested commit SHA.' >&2
  exit 1
}

# The application itself must report the same commit (GET /api/version, Issue #45).
LIVE_COMMIT=""
for attempt in 1 2 3 4 5; do
  LIVE_COMMIT="$(curl -fsS --max-time 20 "${SERVICE_URL}/api/version" 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("commit") or "")' 2>/dev/null || true)"
  [[ "$LIVE_COMMIT" == "$IMAGE_TAG" ]] && break
  sleep 5
done
[[ "$LIVE_COMMIT" == "$IMAGE_TAG" ]] || {
  echo "The live service reports commit '${LIVE_COMMIT:-none}', not the deployed commit." >&2
  exit 1
}

printf 'Commit: %s\nImage digest: %s\nCloud Run revision: %s\n' \
  "$IMAGE_TAG" "$DIGEST_IMAGE" "$DEPLOYED_REVISION"

if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'SERVICE_URL=%s\nDEPLOYED_IMAGE=%s\nDEPLOYED_REVISION=%s\n' \
    "$SERVICE_URL" "$DIGEST_IMAGE" "$DEPLOYED_REVISION" >> "$GITHUB_ENV"
fi
