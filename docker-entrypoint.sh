#!/bin/sh
set -e

case "$1" in
*entrypoint.sh | sh | bash | /bin/sh | /bin/bash) shift ;;
esac

mode="${1:-app}"

post_internal() {
	bun -e 'const r = await fetch(`${process.env.API_URL}/internal/${process.argv[1]}`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }); if (!r.ok) { console.error(`${r.status} ${await r.text()}`); process.exit(1); } console.log(`${process.argv[1]} ${r.status}`);' "$1"
}

case "$mode" in
app)
	cd /repo/apps/app
	exec node "$(node -p "require.resolve('next/dist/bin/next')")" start
	;;
api)
	cd /repo/apps/api
	exec bun run start:prod
	;;
agent)
	cd /repo/apps/agent
	exec bun run start
	;;
cron)
	: "${CRON_SECRET:?CRON_SECRET is required for cron mode}"
	: "${API_URL:?API_URL is required for cron mode}"
	if [ "$2" = "daily" ]; then
		for route in sync/rates telemetry/rollup tracking/retention archive/prune; do
			post_internal "$route"
		done
		exit 0
	fi
	post_internal "${2:?cron mode needs a route, e.g. entrypoint.sh cron sync/mailboxes}"
	;;
migrate)
	cd /repo
	exec bun run db:deploy
	;;
*)
	echo "unknown mode: $mode" >&2
	exit 2
	;;
esac
