#!/bin/sh
set -e
# Hands control to the CMD so the app is PID 1 and receives SIGTERM from Cloud Run.
# Migrations do not run here; they run in a separate job before the service is updated.
exec "$@"
