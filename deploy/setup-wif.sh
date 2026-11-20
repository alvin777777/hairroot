#!/usr/bin/env bash
# HairRoot keyless GitHub Actions to GCP setup (Lab 5 Issue #32), following Student Guide Episode 6.
# Run after deploy/deploy.sh, from the repository root in Cloud Shell, by a project Owner:
#   DRY_RUN=1 PROJECT_ID=cpe334-hairroot bash deploy/setup-wif.sh
#   PROJECT_ID=cpe334-hairroot bash deploy/setup-wif.sh
# It creates no service account key. It prints the four GitHub variables at the end; none is secret.
set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"
run_cmd() {
  if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] '; else printf '+ '; fi
  printf '%q ' "$@"; printf '\n'
  if [ "$DRY_RUN" != "1" ]; then "$@"; fi
}
ensure() {
  local describe="$1"; shift
  if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] (if missing) '; run_cmd "$@";
  elif ! eval "$describe" >/dev/null 2>&1; then run_cmd "$@"; fi
}

if [ "$DRY_RUN" = "1" ]; then
  PROJECT_ID="${PROJECT_ID:-example-gcp-project}"; PROJECT_NUMBER="123456789012"
else
  PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
  [ -n "$PROJECT_ID" ] || { echo "Set PROJECT_ID first." >&2; exit 1; }
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
fi

# Repository identity, from: gh api repos/alvin777777/hairroot and .../actions/oidc/customization/sub
# This repository uses immutable subject claims, so the subject carries owner and repository IDs.
GITHUB_REPO="alvin777777/hairroot"
REPO_ID="1449523924"
OWNER_ID="161717496"
SUBJECT="repo:alvin777777@${OWNER_ID}/hairroot@${REPO_ID}:environment:demo"

APP="hairroot"
DEPLOYER="${APP}-deployer"
DEPLOYER_EMAIL="${DEPLOYER}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNNER_EMAIL="${APP}-runner@${PROJECT_ID}.iam.gserviceaccount.com"
POOL="github-actions"
PROVIDER="github-main"
P=(--project "$PROJECT_ID")

run_cmd gcloud services enable iamcredentials.googleapis.com sts.googleapis.com "${P[@]}"

ensure "gcloud iam service-accounts describe $DEPLOYER_EMAIL ${P[*]}" \
  gcloud iam service-accounts create "$DEPLOYER" --display-name="HairRoot GitHub deployer" "${P[@]}"

# Least privilege for the deployer: update Cloud Run, push images to the hairroot repository only,
# and act as the runtime service account only. It cannot read secrets, manage IAM, or create databases.
run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${DEPLOYER_EMAIL}" \
  --role="roles/run.developer" --condition=None --quiet
run_cmd gcloud artifacts repositories add-iam-policy-binding "$APP" --location "$REGION" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/artifactregistry.writer" "${P[@]}" --quiet
run_cmd gcloud iam service-accounts add-iam-policy-binding "$RUNNER_EMAIL" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/iam.serviceAccountUser" "${P[@]}" --quiet

ensure "gcloud iam workload-identity-pools describe $POOL --location global ${P[*]}" \
  gcloud iam workload-identity-pools create "$POOL" --location global --display-name="GitHub Actions" "${P[@]}"

# Accept only the deploy workflow on main of this repository, through the demo environment.
CONDITION="assertion.sub == '${SUBJECT}' && assertion.repository_id == '${REPO_ID}' && assertion.repository_owner_id == '${OWNER_ID}' && assertion.ref == 'refs/heads/main' && assertion.job_workflow_ref.startsWith('${GITHUB_REPO}/.github/workflows/deploy.yml@')"
ensure "gcloud iam workload-identity-pools providers describe $PROVIDER --workload-identity-pool $POOL --location global ${P[*]}" \
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --workload-identity-pool "$POOL" \
  --location global --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.environment=assertion.environment" \
  --attribute-condition="$CONDITION" "${P[@]}"

POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}"
run_cmd gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository_id/${REPO_ID}" "${P[@]}" --quiet

echo
echo "Set these in GitHub: Settings > Environments > demo > Environment variables (none are secret):"
echo "  GCP_PROJECT_ID      = ${PROJECT_ID}"
echo "  GCP_REGION          = ${REGION}"
echo "  WIF_PROVIDER        = ${POOL_ID}/providers/${PROVIDER}"
echo "  WIF_SERVICE_ACCOUNT = ${DEPLOYER_EMAIL}"
echo "Keys on the deployer (must be empty or only system-managed):"
[ "$DRY_RUN" = "1" ] || gcloud iam service-accounts keys list --iam-account "$DEPLOYER_EMAIL" --managed-by=user "${P[@]}"
