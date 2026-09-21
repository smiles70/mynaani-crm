import { afterEach, describe, expect, it, mock } from "bun:test";
import {
	type FiledLead,
	LeadNotifyService,
} from "../src/tracking/lead-notify.service";

const lead: FiledLead = {
	contactId: "contact-1",
	email: "lead@acme.test",
	name: "Kim Lead",
	host: "mynaani.test",
	path: "/contact",
};

const ENV_KEYS = [
	"RESEND_API_KEY",
	"LEAD_NOTIFY_TO",
	"LEAD_NOTIFY_FROM",
] as const;

const ORIGINAL_ENV = new Map(
	ENV_KEYS.map((key) => [key, process.env[key]] as const),
);
const ORIGINAL_FETCH = globalThis.fetch;

function restore() {
	for (const key of ENV_KEYS) {
		const value = ORIGINAL_ENV.get(key);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	globalThis.fetch = ORIGINAL_FETCH;
}

function stubFetch() {
	const calls: { url: string; body: Record<string, unknown> | null }[] = [];
	globalThis.fetch = mock(
		async (url: RequestInfo | URL, init?: RequestInit) => {
			calls.push({
				url: String(url),
				body: init?.body
					? (JSON.parse(String(init.body)) as Record<string, unknown>)
					: null,
			});
			return new Response("ok", { status: 200 });
		},
	) as unknown as typeof fetch;
	return calls;
}

afterEach(restore);

describe("LeadNotifyService", () => {
	it("sends nothing when the channel is not configured", async () => {
		for (const key of ENV_KEYS) delete process.env[key];
		const calls = stubFetch();

		await new LeadNotifyService().leadFiled(lead);

		expect(calls).toHaveLength(0);
	});

	it("emails only when all three Resend vars are set", async () => {
		for (const key of ENV_KEYS) delete process.env[key];
		process.env.RESEND_API_KEY = "re_test";
		process.env.LEAD_NOTIFY_TO = "kim@mindbyndr.com";
		let calls = stubFetch();

		await new LeadNotifyService().leadFiled(lead);
		expect(calls).toHaveLength(0);

		process.env.LEAD_NOTIFY_FROM = "leads@mynaani.com";
		calls = stubFetch();

		await new LeadNotifyService().leadFiled(lead);

		expect(calls).toHaveLength(1);
		const body = calls[0]?.body;
		expect(body?.to).toEqual(["kim@mindbyndr.com"]);
		expect(String(body?.subject)).toContain("Kim Lead");
	});

	it("swallows a send failure", async () => {
		process.env.RESEND_API_KEY = "re_test";
		process.env.LEAD_NOTIFY_TO = "kim@mindbyndr.com";
		process.env.LEAD_NOTIFY_FROM = "leads@mynaani.com";
		globalThis.fetch = mock(async () => {
			throw new Error("connection refused");
		}) as unknown as typeof fetch;

		await new LeadNotifyService().leadFiled(lead);
	});

	it("swallows a non-2xx response", async () => {
		process.env.RESEND_API_KEY = "re_test";
		process.env.LEAD_NOTIFY_TO = "kim@mindbyndr.com";
		process.env.LEAD_NOTIFY_FROM = "leads@mynaani.com";
		globalThis.fetch = mock(
			async () => new Response("nope", { status: 500 }),
		) as unknown as typeof fetch;

		await new LeadNotifyService().leadFiled(lead);
	});
});
