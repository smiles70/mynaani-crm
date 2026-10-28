import { beforeEach, describe, expect, it } from "bun:test";
import { sendMagicLinkEmail } from "../../../packages/auth/src/magic-link-mailer";

const originalFetch = globalThis.fetch;
const VERIFY_URL =
	"https://api.example.com/api/auth/magic-link/verify?token=abc123&callbackURL=%2F";

type ResendSendBody = {
	from?: string;
	to?: string[];
	subject?: string;
	html?: string;
	text?: string;
};

function captureSend() {
	const calls: { url: string; body: ResendSendBody | null }[] = [];
	globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
		calls.push({
			url: String(input),
			body: init?.body
				? (JSON.parse(String(init.body)) as ResendSendBody)
				: null,
		});
		return new Response("{}", { status: 200 });
	}) as unknown as typeof fetch;
	return calls;
}

beforeEach(() => {
	globalThis.fetch = originalFetch;
	delete process.env.RESEND_API_KEY;
	delete process.env.LEAD_NOTIFY_FROM;
	process.env.ALLOWED_SIGN_IN = "sharkwheel.com";
});

describe("sendMagicLinkEmail", () => {
	it("does not call Resend for a non-allowlisted email", async () => {
		const calls = captureSend();
		process.env.RESEND_API_KEY = "rk_test";
		process.env.LEAD_NOTIFY_FROM = "crm@example.com";
		await sendMagicLinkEmail({ email: "attacker@evil.com", url: VERIFY_URL });
		expect(calls).toHaveLength(0);
	});

	it("does not call Resend when RESEND_API_KEY is unset", async () => {
		const calls = captureSend();
		await sendMagicLinkEmail({
			email: "zack@sharkwheel.com",
			url: VERIFY_URL,
		});
		expect(calls).toHaveLength(0);
	});

	it("does not send when the verify URL has no token", async () => {
		const calls = captureSend();
		process.env.RESEND_API_KEY = "rk_test";
		process.env.LEAD_NOTIFY_FROM = "crm@example.com";
		await sendMagicLinkEmail({
			email: "zack@sharkwheel.com",
			url: "https://api.example.com/api/auth/magic-link/verify",
		});
		expect(calls).toHaveLength(0);
	});

	it("mails a confirm-page link, not the one-time verify URL", async () => {
		const calls = captureSend();
		process.env.RESEND_API_KEY = "rk_test";
		process.env.LEAD_NOTIFY_FROM = "crm@example.com";
		await sendMagicLinkEmail({
			email: "zack@sharkwheel.com",
			url: VERIFY_URL,
		});
		expect(calls).toHaveLength(1);
		const send = calls.at(0);
		if (!send) throw new Error("expected exactly one Resend call");
		expect(send.url).toBe("https://api.resend.com/emails");
		expect(send.body?.to).toEqual(["zack@sharkwheel.com"]);

		const html = String(send.body?.html ?? "");
		const text = String(send.body?.text ?? "");
		expect(html).toContain("/sign-in/magic-confirm");
		expect(html).toContain("token=abc123");
		expect(html).not.toContain("magic-link/verify");
		expect(text).not.toContain("magic-link/verify");

		const mailed = new URL(html.match(/href="([^"]+)"/)?.[1] ?? "");
		expect(mailed.origin).toBe("https://app.example.com");
		expect(mailed.pathname).toBe("/sign-in/magic-confirm");
		expect(mailed.searchParams.get("token")).toBe("abc123");
		expect(mailed.searchParams.get("callbackURL")).toBe("/");
	});
});
