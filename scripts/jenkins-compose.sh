#!/bin/sh
set +x
set -eu

cd "$(dirname "$0")/.."

# Shell variables override --env-file in Compose. The credential file must be
# authoritative even when this agent also runs jobs with environment settings.
unset POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB BETTER_AUTH_SECRET BETTER_AUTH_URL
unset DISABLE_SIGNUP APP_PORT LOG_LEVEL GROQ_API_KEY GROQ_MODEL GROQ_FALLBACK_MODEL
unset LATEX_COMPILER_TOKEN OCR_SERVICE_TOKEN OBJECT_STORAGE_ACCESS_KEY
unset OBJECT_STORAGE_SECRET_KEY OBJECT_STORAGE_BUCKET RESEND_API_KEY RESEND_FROM_EMAIL
unset OPENROUTER_API_KEY OPENROUTER_TIER_3_MODEL

compose_env_file=/dev/null
compose() {
  # Match the manual deployment's project even if COMPOSE_PROJECT_NAME is set,
  # and ignore any .env left in the workspace.
  docker compose --project-name job-application-assistant --file docker-compose.yml --env-file "$compose_env_file" "$@"
}

case "${1:-}" in
  validate-build|build)
    # Compose interpolates runtime settings even for builds. These values must
    # never start containers; only the two build-related commands are allowed.
    export POSTGRES_PASSWORD=build-only-database-password
    export BETTER_AUTH_SECRET=build-only-auth-secret-at-least-thirty-two-characters
    export BETTER_AUTH_URL=http://localhost:3000
    export GROQ_API_KEY=build-only
    export LATEX_COMPILER_TOKEN=build-only-compiler-token-at-least-thirty-two-characters
    export OCR_SERVICE_TOKEN=build-only-ocr-token-at-least-thirty-two-characters
    export OBJECT_STORAGE_ACCESS_KEY=build-only
    export OBJECT_STORAGE_SECRET_KEY=build-only-storage-secret-at-least-thirty-two-characters
    export RESEND_API_KEY= RESEND_FROM_EMAIL=

    if [ "$1" = validate-build ]; then
      compose config --quiet
    else
      compose build --pull
    fi
    ;;
  deploy)
    : "${JAA_ENV_FILE:?Missing Jenkins Secret file credential: job-assistant-production-env}"
    if [ ! -f "$JAA_ENV_FILE" ] || [ ! -r "$JAA_ENV_FILE" ] || [ ! -s "$JAA_ENV_FILE" ]; then
      echo 'The production environment credential must be a readable, nonempty file.' >&2
      exit 1
    fi
    compose_env_file=$JAA_ENV_FILE

    # Validate before downtime. Never print interpolated config or application
    # logs. Even dotenv parser errors can quote a malformed line containing a secret.
    if ! compose config --quiet >/dev/null 2>&1; then
      echo 'Production Compose validation failed. Check the Secret file against .env.example and docs/deployment.md.' >&2
      exit 1
    fi
    trap 'result=$?; if [ "$result" -ne 0 ]; then compose ps --all || true; fi; exit "$result"' 0

    # The worker has 200 seconds to finish before the migration changes schema.
    compose stop app worker
    if ! compose run --rm migrate; then
      # Failed migrations are transactional; the old containers retain their images.
      compose start app worker || true
      exit 1
    fi
    compose up --detach --no-build --wait --wait-timeout 300 --remove-orphans
    compose ps
    ;;
  *)
    echo 'Usage: sh scripts/jenkins-compose.sh validate-build|build|deploy' >&2
    exit 2
    ;;
esac
