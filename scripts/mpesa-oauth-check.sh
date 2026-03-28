#!/usr/bin/env bash
# Verify Daraja OAuth for STK and B2C apps (reads .env from project root).
# Does not print secrets. Usage: ./scripts/mpesa-oauth-check.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ ! -f "$ROOT/.env" ]]; then
  echo "No .env at $ROOT — copy .env.example to .env and fill M-Pesa vars."
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

if [[ "${MPESA_ENV:-production}" == "sandbox" ]]; then
  API="https://sandbox.safaricom.co.ke"
else
  API="https://api.safaricom.co.ke"
fi

try_oauth() {
  local label="$1" key="$2" secret="$3"
  if [[ -z "$key" || -z "$secret" ]]; then
    echo "$label: SKIP (missing consumer key or secret)"
    return
  fi
  local code body
  code="$(curl -sS -o /tmp/mpesa_oauth_$$.json -w "%{http_code}" -u "${key}:${secret}" \
    "${API}/oauth/v1/generate?grant_type=client_credentials")"
  body="$(head -c 120 /tmp/mpesa_oauth_$$.json; rm -f /tmp/mpesa_oauth_$$.json)"
  if [[ "$code" == "200" ]]; then
    echo "$label: OK (OAuth token issued)"
  else
    echo "$label: FAIL HTTP $code — ${body}…"
  fi
}

STK_KEY="${MPESA_STK_CONSUMER_KEY:-$MPESA_CONSUMER_KEY}"
STK_SEC="${MPESA_STK_CONSUMER_SECRET:-$MPESA_CONSUMER_SECRET}"
B2C_KEY="${MPESA_B2C_CONSUMER_KEY:-$MPESA_CONSUMER_KEY}"
B2C_SEC="${MPESA_B2C_CONSUMER_SECRET:-$MPESA_CONSUMER_SECRET}"

echo "Daraja base: $API"
try_oauth "STK (Lipa na M-Pesa) OAuth" "$STK_KEY" "$STK_SEC"
try_oauth "B2C OAuth" "$B2C_KEY" "$B2C_SEC"
