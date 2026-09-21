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

type ResendSendBody = {
	from?: string;
	to?: string[];
	subject?: string;
	text?: string;
};

function stubFetch() {
	const calls: { url: string; body: ResendSendBody | null }[] = [];
	globalThis.fetch = mock(
		async (url: string | URL, init?: RequestInit) => {
			calls.push({
				url: String(url),
				body: init?.body
					? (JSON.parse(String(init.body)) as ResendSendBody)
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

	it("sends one email per address in a comma-separated LEAD_NOTIFY_TO", async () => {
		process.env.RESEND_API_KEY = "re_test";
		process.env.LEAD_NOTIFY_TO =
			" steven@mindbyndr.com , kim@mindbyndr.com , kim@mindbyndr.com ";
		process.env.LEAD_NOTIFY_FROM = "leads@mynaani.com";
		const calls = stubFetch();

		await new LeadNotifyService().leadFiled(lead);

		expect(calls).toHaveLength(2);
		expect(calls[0]?.body?.to).toEqual(["steven@mindbyndr.com"]);
		expect(calls[1]?.body?.to).toEqual(["kim@mindbyndr.com"]);
	});

	it("delivers other recipients when one address is rejected", async () => {
		process.env.RESEND_API_KEY = "re_test";
		process.env.LEAD_NOTIFY_TO = "steven@mindbyndr.com,kim@mindbyndr.com";
		process.env.LEAD_NOTIFY_FROM = "leads@mynaani.com";
		const calls: { url: string; body: ResendSendBody | null }[] = [];
		globalThis.fetch = mock(
			async (url: string | URL, init?: RequestInit) => {
				const body = init?.body
					? (JSON.parse(String(init.body)) as ResendSendBody)
					: null;
				calls.push({ url: String(url), body });
				const rejected = body?.to?.[0] === "kim@mindbyndr.com";
				return new Response("nope", { status: rejected ? 403 : 200 });
			},
		) as unknown as typeof fetch;

		await new LeadNotifyService().leadFiled(lead);

		expect(calls).toHaveLength(2);
		expect(calls[0]?.body?.to).toEqual(["steven@mindbyndr.com"]);
		expect(calls[1]?.body?.to).toEqual(["kim@mindbyndr.com"]);
	});

	it("drops malformed addresses and treats an empty list as off", async () => {
		process.env.RESEND_API_KEY = "re_test";
		process.env.LEAD_NOTIFY_TO = "not-an-email, ,steven@mindbyndr.com";
		process.env.LEAD_NOTIFY_FROM = "leads@mynaani.com";
		let calls = stubFetch();

		await new LeadNotifyService().leadFiled(lead);
		expect(calls[0]?.body?.to).toEqual(["steven@mindbyndr.com"]);

		process.env.LEAD_NOTIFY_TO = "not-an-email, ,also-bad";
		calls = stubFetch();

		await new LeadNotifyService().leadFiled(lead);
		expect(calls).toHaveLength(0);
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
