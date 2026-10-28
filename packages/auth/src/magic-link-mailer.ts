import { env } from "./env";
import { isWorkspaceEmail } from "./workspace";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;
const PRODUCT_NAME = "Shark Wheel CRM";
const SUBJECT = `${PRODUCT_NAME} sign-in link`;
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

function buildHtml(url: string): string {
	return `<p>Here is your sign-in link for ${PRODUCT_NAME}:</p><p><a href="${url}">Open the sign-in page</a></p><p>Press the sign-in button on that page to finish. The link works once and expires in 10 minutes. If it says the link was already used, request a new one — some email systems scan links before you click.</p>`;
}

function buildText(url: string): string {
	return `Here is your sign-in link for ${PRODUCT_NAME}:\n\n${url}\n\nPress the sign-in button on that page to finish. The link works once and expires in 10 minutes. If it says the link was already used, request a new one — some email systems scan links before you click.`;
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
	const apiKey = process.env.RESEND_API_KEY?.trim();
	const from = process.env.LEAD_NOTIFY_FROM?.trim();
	const link = confirmUrl(url);
	if (!apiKey || !from || !link) {
		console.warn("magic-link mailer not configured — skipping send", {
			email,
		});
		return;
	}
	const sent = await postMagicLink(apiKey, from, email, link);
	if (!sent) {
		console.error("magic-link send failed", { email });
	}
}
