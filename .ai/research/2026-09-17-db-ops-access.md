# Research — Safe operator access to Postgres (p7)

**Date:** 2026-09-17
**Intake:** `.ai/intake/2026-09-17-p7-db-ops-access.md`
**Question:** How do we run one-off DB commands on Railway Postgres
without a standing public port?

## Sources

| Source | Org | Type | Finding |
| --- | --- | --- | --- |
| docs.railway.com/guides/postgresql | Railway | vendor docs | Private networking is the default; public access requires an explicit TCP proxy per service+environment |
| `railway ssh` CLI | Railway | vendor tool | Executes commands inside a service container; requires a registered SSH key; this session's non-interactive exec hung while interactive register worked |
| `tcpProxyCreate`/`tcpProxyDelete` GraphQL | Railway | vendor API | Proxy lifetime is fully operator-controlled; no auto-expiry — the hazard |
| Session evidence (2026-09-17) | this workspace | incident | Two proxies opened for role checks, deleted after; window was minutes but relied on memory |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| `tools/db-admin.sh`: open proxy → run command → `trap` deletes proxy | Window bounded to seconds by the script itself; no inside-container dependency | High |
| `railway ssh -- bun -e …` inside api | No public port at all; relies on the ssh exec path that hung this session | Medium |
| Standing proxy with firewall rules | Persistent public exposure — the thing being eliminated | Rejected |

## Selected approach

Write `tools/db-admin.sh`: creates a TCP proxy for the named
environment, resolves `PGPASSWORD` from service variables, runs the
command/SQL passed to it, and always deletes the proxy — `trap` on
EXIT/INT/TERM so a killed run still closes the door. Document the
single command in `docs/setup.md` or the `.railway/README.md` ops
section. Retry `railway ssh` exec as the preferred zero-exposure path
once; if it stays flaky, the proxy script is the documented
procedure.

## Edge cases

- Proxy creation is async — the script must poll until the port
  answers before connecting.
- `PGPASSWORD` is a secret; the script resolves it via `railway
  variables` at run time and never writes it to disk.
- Two concurrent runs racing on proxy create/delete: name-check the
  returned proxy id and delete only that id.
- Production use stays rare and deliberate — the script prints the
  environment it touches and requires it as an explicit argument.
