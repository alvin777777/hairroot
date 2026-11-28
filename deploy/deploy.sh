#!/usr/bin/env bash
# HairRoot one-time GCP setup and first deploy (Lab 5 Issue #31), adapted from the Lab 5 Starter Kit.
# Run from the repository root in Cloud Shell, by a project Owner (it grants IAM roles):
#   DRY_RUN=1 PROJECT_ID=cpe334-hairroot bash deploy/deploy.sh   # print every command first
#   PROJECT_ID=cpe334-hairroot bash deploy/deploy.sh
# Safe to rerun: existing resources are kept. Passwords are generated into Secret Manager and never printed.
set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"

run_cmd() {
  local arg
  if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] '; else printf '+ '; fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then "$@"; fi
}

# Runs a create command only when the matching describe command fails (or always prints both in DRY_RUN).
ensure() {
  local describe="$1"; shift
  if [ "$DRY_RUN" = "1" ]; then
    printf '[DRY_RUN] (if missing) '; run_cmd "$@"
  elif ! eval "$describe" >/dev/null 2>&1; then
    run_cmd "$@"
  fi
}

if [ "$DRY_RUN" = "1" ]; then
  PROJECT_ID="${PROJECT_ID:-example-gcp-project}"
else
  PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
  [ -n "$PROJECT_ID" ] || { echo "Set PROJECT_ID or run: gcloud config set project YOUR_PROJECT_ID" >&2; exit 1; }
fi

APP="hairroot"
REPO_NAME="$APP"
SQL_INSTANCE="${APP}-pg"
DB_NAME="$APP"
DB_USER="$APP"
SERVICE_NAME="$APP"
MIGRATE_JOB_NAME="${APP}-migrate"
SA_NAME="${APP}-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:initial"
SECRET_DB_URL="${APP}-database-url"
SECRET_DEMO_PASS="${APP}-demo-password"
P=(--project "$PROJECT_ID")

echo "HairRoot first deploy | project ${PROJECT_ID} | region ${REGION} | dry run ${DRY_RUN}"

run_cmd gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com iam.googleapis.com "${P[@]}"

ensure "gcloud artifacts repositories describe $REPO_NAME --location $REGION ${P[*]}" \
  gcloud artifacts repositories create "$REPO_NAME" --repository-format=docker --location "$REGION" \
  --description="HairRoot images" "${P[@]}"

# Smallest tier, storage auto-increase off, to keep cost low (Lab 5 Section 5).
ensure "gcloud sql instances describe $SQL_INSTANCE ${P[*]}" \
  gcloud sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_16 --edition=enterprise \
  --tier=db-f1-micro --region="$REGION" --storage-size=10GB --storage-type=SSD --no-storage-auto-increase \
  --backup-start-time=03:00 "${P[@]}"

ensure "gcloud sql databases describe $DB_NAME --instance=$SQL_INSTANCE ${P[*]}" \
  gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" "${P[@]}"

ensure "gcloud iam service-accounts describe $SA_EMAIL ${P[*]}" \
  gcloud iam service-accounts create "$SA_NAME" --display-name="HairRoot Cloud Run runtime" "${P[@]}"

run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client" --condition=None --quiet

# DATABASE_URL: a generated database password, stored only in Secret Manager.
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="<GENERATED>" "${P[@]}"
  run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy=automatic "${P[@]}"
elif ! gcloud secrets describe "$SECRET_DB_URL" "${P[@]}" >/dev/null 2>&1; then
  DB_PASS="$(openssl rand -hex 24)"
  if gcloud sql users list --instance="$SQL_INSTANCE" "${P[@]}" --format="value(name)" | grep -qx "$DB_USER"; then
    run_cmd gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" "${P[@]}"
  else
    run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" "${P[@]}"
  fi
  run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy=automatic "${P[@]}"
  printf '%s' "postgresql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}?host=/cloudsql/${SQL_CONN_NAME}&schema=public&connection_limit=3" \
    | gcloud secrets versions add "$SECRET_DB_URL" --data-file=- "${P[@]}" >/dev/null
fi

# SEED_DEMO_PASSWORD for the synthetic demo accounts (Lab 6 partner testing). Shared privately, never printed.
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud secrets create "$SECRET_DEMO_PASS" --replication-policy=automatic "${P[@]}"
elif ! gcloud secrets describe "$SECRET_DEMO_PASS" "${P[@]}" >/dev/null 2>&1; then
  run_cmd gcloud secrets create "$SECRET_DEMO_PASS" --replication-policy=automatic "${P[@]}"
  printf '%s' "$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)Hr1" \
    | gcloud secrets versions add "$SECRET_DEMO_PASS" --data-file=- "${P[@]}" >/dev/null
fi

for secret in "$SECRET_DB_URL" "$SECRET_DEMO_PASS"; do
  run_cmd gcloud secrets add-iam-policy-binding "$secret" --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" "${P[@]}" --quiet
done

run_cmd gcloud builds submit --tag "$IMAGE_URI" "${P[@]}"

# Migrations and the rerunnable seed run as a job before the service starts.
run_cmd gcloud run jobs deploy "$MIGRATE_JOB_NAME" --image "$IMAGE_URI" --region "$REGION" \
  --service-account "$SA_EMAIL" --set-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest,SEED_DEMO_PASSWORD=${SECRET_DEMO_PASS}:latest" \
  --set-env-vars "NODE_ENV=production,TZ=Asia/Bangkok" \
  --command sh --args "-c,npx prisma migrate deploy && npm run db:seed" \
  --max-retries 1 --task-timeout 300s "${P[@]}"
if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" --region "$REGION" --wait "${P[@]}"; then
  echo "Migration job failed; the service was not deployed. Logs:" >&2
  echo "  gcloud logging read 'resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATE_JOB_NAME}' --project ${PROJECT_ID} --limit 50" >&2
  exit 1
fi

run_cmd gcloud run deploy "$SERVICE_NAME" --image "$IMAGE_URI" --region "$REGION" --platform managed \
  --allow-unauthenticated --service-account "$SA_EMAIL" --add-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" --set-env-vars "NODE_ENV=production,TZ=Asia/Bangkok" \
  --min-instances 0 --max-instances 3 --memory 512Mi --cpu 1 --port 3000 "${P[@]}"

# The service answers at two URLs; allow both as browser origins (comma-separated CLIENT_ORIGIN).
if [ "$DRY_RUN" = "1" ]; then
  ORIGINS="https://${SERVICE_NAME}-<hash>-as.a.run.app,https://${SERVICE_NAME}-<number>.${REGION}.run.app"
else
  ORIGINS="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" "${P[@]}" --format=json \
    | python3 -c 'import json,sys; s=json.load(sys.stdin); u=json.loads(s["metadata"]["annotations"].get("run.googleapis.com/urls","[]")); u=u or [s["status"]["url"]]; print(",".join(dict.fromkeys(u+[s["status"]["url"]])))')"
fi
run_cmd gcloud run services update "$SERVICE_NAME" --region "$REGION" "${P[@]}" \
  --update-env-vars "^@^CLIENT_ORIGIN=${ORIGINS}"

echo
echo "Deployment complete."
echo "Allowed origins : ${ORIGINS}"
echo "Health          : <service URL>/api/health and /api/ready"
echo "Demo password   : in Secret Manager as ${SECRET_DEMO_PASS} (not printed)"
