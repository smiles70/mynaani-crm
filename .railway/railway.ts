import { defineRailway, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-west2" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 5000 });
  const cronDaily = service("cron-daily", {
    start: "/usr/local/bin/entrypoint.sh cron daily",
    replicas: { "us-west2": 1 },
    deploy: { cronSchedule: "30 4 * * *", restartPolicyType: "NEVER" },
    env: { API_URL: preserve(), CRON_SECRET: preserve() },
  });
  const api = service("api", {
    start: "/usr/local/bin/entrypoint.sh api",
    preDeploy: "/usr/local/bin/entrypoint.sh migrate",
    healthcheck: "/health",
    replicas: { "us-west2": 1 },
    deploy: { healthcheckTimeout: 300, drainingSeconds: 20 },
    env: { AGENT_BRIDGE_SECRET: preserve(), AGENT_URL: preserve(), ALLOWED_SIGN_IN: preserve(), API_URL: preserve(), APP_URL: preserve(), BETTER_AUTH_SECRET: preserve(), CRM_TELEMETRY_DISABLED: preserve(), CRON_SECRET: preserve(), DATABASE_URL: preserve(), DO_NOT_TRACK: preserve(), NODE_ENV: preserve() },
  });
  const app = service("app", {
    start: "/usr/local/bin/entrypoint.sh app",
    healthcheck: "/api/auth/ok",
    replicas: { "us-west2": 1 },
    deploy: { healthcheckTimeout: 300, drainingSeconds: 20 },
    env: { AGENT_BRIDGE_SECRET: preserve(), AGENT_URL: preserve(), API_URL: preserve(), APP_URL: preserve(), CRM_TELEMETRY_DISABLED: preserve(), DATABASE_URL: preserve(), DO_NOT_TRACK: preserve(), NEXT_PUBLIC_API_URL: preserve(), NODE_ENV: preserve() },
  });
  const cronMailboxes = service("cron-mailboxes", {
    start: "/usr/local/bin/entrypoint.sh cron sync/mailboxes",
    replicas: { "us-west2": 1 },
    deploy: { cronSchedule: "*/5 * * * *", restartPolicyType: "NEVER" },
    env: { API_URL: preserve(), CRON_SECRET: preserve() },
  });
  const agent = service("agent", {
    start: "/usr/local/bin/entrypoint.sh agent",
    replicas: { "us-west2": 1 },
    deploy: { drainingSeconds: 20 },
    env: { AGENT_BRIDGE_SECRET: preserve(), AGENT_PORT: preserve(), API_URL: preserve(), APP_URL: preserve(), CRM_TELEMETRY_DISABLED: preserve(), DATABASE_URL: preserve(), DO_NOT_TRACK: preserve(), NODE_ENV: preserve() },
  });

  return project("mynaani-crm", {
    resources: [cronDaily, api, Postgres, app, cronMailboxes, agent, postgresVolume],
  });
});
