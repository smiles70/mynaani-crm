import { env } from "./env";
import { isWorkspaceEmail } from "./workspace";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;
const PRODUCT_NAME = "Shark Wheel CRM";
const SUBJECT = `Welcome to ${PRODUCT_NAME} — your sign-in link`;
const CONFIRM_PATH = "/sign-in/magic-confirm";
const FORWARDED_PARAMS = [
	"token",
	"callbackURL",
	"errorCallbackURL",
	"newUserCallbackURL",
] as const;

function confirmUrl(verifyUrl: string): string | null {
	try {
		const verify = new URL(verifyUrl);
		const confirm = new URL(CONFIRM_PATH, env.appUrl);
		for (const key of FORWARDED_PARAMS) {
			const value = verify.searchParams.get(key);
			if (value !== null) confirm.searchParams.set(key, value);
		}
		if (!confirm.searchParams.get("token")) return null;
		return confirm.toString();
	} catch {
		return null;
	}
}

const STEPS = [
	"Open the link below to reach your sign-in page.",
	"Press Sign in on that page and you are inside.",
	"The link works once. Whenever you need a new one, request it from the sign-in page.",
	"No password and nothing to remember. Every visit starts with an email just like this one.",
];

function buildHtml(url: string): string {
	const steps = STEPS.map((step) => `<li>${step}</li>`).join("");
	return `<p>Welcome to ${PRODUCT_NAME}. Your sign-in link is ready.</p><ol>${steps}</ol><p><a href="${url}">Open your sign-in page</a></p><p>Shark Wheel CRM</p>`;
}

function buildText(url: string): string {
	const steps = STEPS.map((step, i) => `${i + 1}. ${step}`).join("\n");
	return `Welcome to ${PRODUCT_NAME}. Your sign-in link is ready.\n\n${steps}\n\nOpen your sign-in page:\n${url}\n\nShark Wheel CRM`;
}

async function postMagicLink(
	apiKey: string,
	from: string,
	to: string,
	url: string,
): Promise<boolean> {
	try {
		const response = await fetch(RESEND_ENDPOINT, {
			method: "POST",
			signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from,
				to: [to],
				subject: SUBJECT,
				html: buildHtml(url),
				text: buildText(url),
			}),
		});
		return response.ok;
	} catch {
		return false;
	}
}

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_ENDPOINT =
	"https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

type GmailCredentials = {
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	address: string;
};

function gmailCredentials(): GmailCredentials | null {
	const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
	const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
	const address = process.env.GMAIL_ADDRESS?.trim();
	if (!clientId || !clientSecret || !refreshToken || !address) return null;
	return { clientId, clientSecret, refreshToken, address };
}

function buildMime(from: string, to: string, url: string): string {
	const boundary = "=_magic-link";
	return [
		`From: ${from}`,
		`To: ${to}`,
		`Subject: ${SUBJECT}`,
		"MIME-Version: 1.0",
		`Content-Type: multipart/alternative; boundary="${boundary}"`,
		"",
		`--${boundary}`,
		'Content-Type: text/plain; charset="UTF-8"',
		"",
		buildText(url),
		`--${boundary}`,
		'Content-Type: text/html; charset="UTF-8"',
		"",
		buildHtml(url),
		`--${boundary}--`,
	].join("\r\n");
}

function base64Url(value: string): string {
	return Buffer.from(value, "utf-8")
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

async function gmailAccessToken(
	credentials: GmailCredentials,
): Promise<string> {
	const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
		method: "POST",
		signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			refresh_token: credentials.refreshToken,
			grant_type: "refresh_token",
		}),
	});
	if (!response.ok) throw new Error(`token refresh failed: ${response.status}`);
	const body = (await response.json()) as { access_token?: string };
	if (!body.access_token) throw new Error("token refresh returned no token");
	return body.access_token;
}

async function postGmail(
	credentials: GmailCredentials,
	to: string,
	url: string,
) {
	try {
		const accessToken = await gmailAccessToken(credentials);
		const response = await fetch(GMAIL_SEND_ENDPOINT, {
			method: "POST",
			signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				raw: base64Url(buildMime(credentials.address, to, url)),
			}),
		});
		return response.ok;
	} catch {
		return false;
	}
}

export async function sendMagicLinkEmail({
	email,
	url,
}: {
	email: string;
	url: string;
}): Promise<void> {
	if (!isWorkspaceEmail(email)) {
		return;
	}
	const link = confirmUrl(url);
	const apiKey = process.env.RESEND_API_KEY?.trim();
	const from = process.env.LEAD_NOTIFY_FROM?.trim();
	const gmail = gmailCredentials();
	if (!link || (!(apiKey && from) && !gmail)) {
		console.warn("magic-link mailer not configured — skipping send", {
			email,
		});
		return;
	}
	const sent =
		apiKey && from
			? await postMagicLink(apiKey, from, email, link)
			: await postGmail(gmail as GmailCredentials, email, link);
	if (!sent) {
		console.error("magic-link send failed", { email });
	}
}
