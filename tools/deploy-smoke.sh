#!/bin/sh
set -e

env_name="${1:-staging}"

case "$env_name" in
staging)
	app_url="https://mynaani-crm-staging.up.railway.app"
	api_url="https://mynaani-crm-staging-api.up.railway.app"
	;;
production)
	app_url="https://mynaani-crm.up.railway.app"
	api_url="https://mynaani-crm-api.up.railway.app"
	;;
*)
	echo "usage: deploy-smoke.sh [staging|production]" >&2
	exit 2
	;;
esac

fail=0

check() {
	label="$1"
	url="$2"
	expect="$3"
	code=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$url" || echo 000)
	if [ "$code" = "$expect" ]; then
		echo "ok   $label ($code)"
	else
		echo "FAIL $label ($code, want $expect) $url"
		fail=1
	fi
}

check "api health" "$api_url/health" 200
check "app auth ok" "$app_url/api/auth/ok" 200
check "app root redirects" "$app_url/" 307
check "sign-in renders" "$app_url/sign-in" 200

exit "$fail"
