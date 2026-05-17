#!/usr/bin/env bash
set -euo pipefail

# Build and push frontend image to ECR.
# Usage:
#   Set in .env:
#     AWS_ACCOUNT_ID, AWS_REGION,
#     ECR_FRONTEND_REPO_STAGING, ECR_FRONTEND_REPO_DEMO, ECR_FRONTEND_REPO_PROD
#   ./build.sh [environment] [tag]
#
# If [environment] is omitted, "staging" is used. Supported: staging, demo, prod.
# If [tag] is omitted, "latest" is used.
# Sources .env from this dir or ../code-python/.env.
# Builds for linux/amd64 by default so the image runs on typical EC2 (x86_64).
# Override with DOCKER_PLATFORM=linux/arm64 if needed.
# VITE_* values are injected at container runtime via docker-entrypoint.sh, not baked in.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "${SCRIPT_DIR}/.env" ]] && set -a && source "${SCRIPT_DIR}/.env" && set +a
[[ -f "${SCRIPT_DIR}/../code-python/.env" ]] && set -a && source "${SCRIPT_DIR}/../code-python/.env" && set +a

ENVIRONMENT="${1:-staging}"
TAG="${2:-latest}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

if [[ -z "${AWS_ACCOUNT_ID:-}" || -z "${AWS_REGION:-}" ]]; then
  echo "ERROR: AWS_ACCOUNT_ID and AWS_REGION must be set (e.g. in .env or environment)." >&2
  exit 1
fi

case "${ENVIRONMENT}" in
  staging)
    ECR_FRONTEND_REPO="${ECR_FRONTEND_REPO_STAGING:-}"
    ;;
  demo)
    ECR_FRONTEND_REPO="${ECR_FRONTEND_REPO_DEMO:-}"
    ;;
  prod)
    ECR_FRONTEND_REPO="${ECR_FRONTEND_REPO_PROD:-}"
    ;;
  *)
    echo "ERROR: environment must be 'staging', 'demo', or 'prod'. Got: ${ENVIRONMENT}" >&2
    exit 1
    ;;
esac

ENVIRONMENT_UPPER="$(printf "%s" "${ENVIRONMENT}" | tr "[:lower:]" "[:upper:]")"

if [[ -z "${ECR_FRONTEND_REPO:-}" ]]; then
  echo "ERROR: ECR_FRONTEND_REPO_${ENVIRONMENT_UPPER} must be set (e.g. in .env or environment)." >&2
  exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_REPO}:${TAG}"

if [[ ! -f "${SCRIPT_DIR}/Dockerfile" ]]; then
  echo "ERROR: Dockerfile not found at ${SCRIPT_DIR}/Dockerfile" >&2
  exit 1
fi

echo "Logging in to ECR: ${AWS_ACCOUNT_ID} in ${AWS_REGION}..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Ensuring ECR repository ${ECR_FRONTEND_REPO} exists..."
aws ecr describe-repositories --repository-names "${ECR_FRONTEND_REPO}" --region "${AWS_REGION}" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "${ECR_FRONTEND_REPO}" --region "${AWS_REGION}" >/dev/null

IMAGE="${ECR_URI}"
CACHE_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_REPO}:cache"

echo "Building and pushing frontend image ${IMAGE} for ${DOCKER_PLATFORM} (${ENVIRONMENT}) with build cache ${CACHE_IMAGE}..."
docker buildx build \
  --platform "${DOCKER_PLATFORM}" \
  --tag "${IMAGE}" \
  --cache-from type=registry,ref="${CACHE_IMAGE}" \
  --cache-to type=registry,ref="${CACHE_IMAGE}",mode=max \
  --push \
  -f "${SCRIPT_DIR}/Dockerfile" \
  "${SCRIPT_DIR}"

echo "Done. Frontend image pushed to: ${IMAGE}"