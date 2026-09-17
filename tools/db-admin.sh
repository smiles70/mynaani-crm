#!/bin/sh
# Run a one-off Postgres command against a Railway environment.
# Opens a TCP proxy for the length of the command and always deletes it.
# Usage: db-admin.sh <staging|production> <sql-file|->
set -eu

env_name="${1:?usage: db-admin.sh <staging|production> <sql-file|->}"
input="${2:?usage: db-admin.sh <staging|production> <sql-file|->}"
service_id="95a9c9f3-8584-4f95-b5c0-099b9c352f1e"

case "$env_name" in
staging) environment_id="82e6bf6b-c135-490e-859b-33c80dcad87f" ;;
production) environment_id="4576d6e6-7f75-4585-8dd7-aa07bafca21e" ;;
*) echo "usage: db-admin.sh <staging|production> <sql-file|->" >&2; exit 2 ;;
esac

created=$(railway api "mutation {tcpProxyCreate(input:{serviceId:\"$service_id\",environmentId:\"$environment_id\",applicationPort:5432}){id domain proxyPort}}")
proxy_id=$(printf '%s' "$created" | sed -n 's/.*"id": *"\([^"]*\)".*/\1/p' | head -1)
domain=$(printf '%s' "$created" | sed -n 's/.*"domain": *"\([^"]*\)".*/\1/p' | head -1)
port=$(printf '%s' "$created" | sed -n 's/.*"proxyPort": *\([0-9]*\).*/\1/p' | head -1)
[ -n "$proxy_id" ] && [ -n "$domain" ] && [ -n "$port" ] || { echo "proxy create failed: $created" >&2; exit 1; }

cleanup() {
	railway api "mutation {tcpProxyDelete(id:\"$proxy_id\")}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "proxy up: $domain:$port (env: $env_name); closing when done"
for _ in 1 2 3 4 5 6 7 8 9 10; do
	(echo >/dev/tcp/"${domain%.}"/"$port") 2>/dev/null && break
	sleep 2
done

password=$(railway variables --service Postgres -e "$env_name" --kv | sed -n 's/^PGPASSWORD=//p')
[ -n "$password" ] || { echo "could not read PGPASSWORD" >&2; exit 1; }

if [ "$input" = "-" ]; then sql=$(cat); else sql=$(cat "$input"); fi

(
	cd packages/db
	SQL="$sql" PGURL="postgresql://postgres:$password@${domain%.}:$port/railway" bun -e '
import pg from "pg";
const c = new pg.Client(process.env.PGURL);
await c.connect();
const r = await c.query(process.env.SQL);
console.log(JSON.stringify(r.rows ?? r.rowCount, null, 2));
await c.end();
'
)

