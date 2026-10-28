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

type GmailSendBody = { raw?: string };

function captureSend() {
	const calls: {
		url: string;
		body: ResendSendBody | GmailSendBody | null;
	}[] = [];
	globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
		const url = String(input);
		let body: ResendSendBody | GmailSendBody | null = null;
		try {
			body = init?.body
				? (JSON.parse(String(init.body)) as ResendSendBody | GmailSendBody)
				: null;
		} catch {
			body = null;
		}
		calls.push({ url, body });
		if (url.includes("oauth2.googleapis.com")) {
			return new Response(JSON.stringify({ access_token: "x" }), {
				status: 200,
			});
		}
		return new Response("{}", { status: 200 });
	}) as unknown as typeof fetch;
	return calls;
}

beforeEach(() => {
	globalThis.fetch = originalFetch;
	delete process.env.RESEND_API_KEY;
	delete process.env.LEAD_NOTIFY_FROM;
	delete process.env.GOOGLE_CLIENT_ID;
	delete process.env.GOOGLE_CLIENT_SECRET;
	delete process.env.GOOGLE_REFRESH_TOKEN;
	delete process.env.GMAIL_ADDRESS;
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
		const body = send.body as ResendSendBody | null;
		expect(body?.to).toEqual(["zack@sharkwheel.com"]);

		const html = String(body?.html ?? "");
		const text = String(body?.text ?? "");
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

	it("sends through Gmail when Resend is not configured", async () => {
		const calls = captureSend();
		process.env.GOOGLE_CLIENT_ID = "cid";
		process.env.GOOGLE_CLIENT_SECRET = "csec";
		process.env.GOOGLE_REFRESH_TOKEN = "rtok";
		process.env.GMAIL_ADDRESS = "ops@mindbyndr.com";
		await sendMagicLinkEmail({
			email: "zack@sharkwheel.com",
			url: VERIFY_URL,
		});

		expect(calls).toHaveLength(2);
		expect(calls.at(0)?.url).toBe("https://oauth2.googleapis.com/token");
		const send = calls.at(1);
		if (!send) throw new Error("expected a Gmail send call");
		expect(send.url).toBe(
			"https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
		);
		const raw = (send.body as GmailSendBody | null)?.raw;
		if (!raw) throw new Error("expected a raw MIME payload");
		const mime = Buffer.from(
			raw.replace(/-/g, "+").replace(/_/g, "/"),
			"base64",
		).toString("utf-8");
		expect(mime).toContain("To: zack@sharkwheel.com");
		expect(mime).toContain("/sign-in/magic-confirm");
		expect(mime).toContain("token=abc123");
		expect(mime).not.toContain("magic-link/verify");
	});
});
