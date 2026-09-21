import "@crm/env/load";

import { db, type RecordSource } from "@crm/db";

const TIMEOUT_MS = 10_000;
const MAX_ALERTS_PER_SWEEP = 10;
const INBOUND_SOURCES: readonly RecordSource[] = ["TRACKING", "RETELL"];

export function rocketChatEnabled(): boolean {
	return Boolean(process.env.ROCKETCHAT_WEBHOOK_URL);
}

export async function sweepNewContactAlerts(): Promise<number> {
	const url = process.env.ROCKETCHAT_WEBHOOK_URL?.trim();
	if (!url) return 0;

	const contacts = await db.contact.findMany({
		where: {
			alertedAt: null,
			source: { in: [...INBOUND_SOURCES] },
		},
		orderBy: { createdAt: "asc" },
		take: MAX_ALERTS_PER_SWEEP,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			phone: true,
			source: true,
			company: { select: { name: true } },
		},
	});
	if (contacts.length === 0) return 0;

	const org = await db.organization.findFirst({ select: { slug: true } });
	const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
	const recordBase = appUrl && org ? `${appUrl}/${org.slug}/contacts` : null;

	let sent = 0;
	for (const contact of contacts) {
		const posted = await post(url, format(contact, recordBase));
		if (!posted) break;
		await db.contact.update({
			where: { id: contact.id },
			data: { alertedAt: new Date() },
		});
		sent += 1;
	}

	return sent;
}

type AlertContact = {
	id: string;
	firstName: string;
	lastName: string | null;
	email: string | null;
	phone: string | null;
	source: RecordSource;
	company: { name: string } | null;
};

function format(contact: AlertContact, recordBase: string | null): string {
	const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
	const details = [contact.email, contact.phone, contact.company?.name].filter(
		Boolean,
	);
	const source = contact.source === "TRACKING" ? "website" : "Retell call/chat";
	const link = recordBase ? ` ${recordBase}/${contact.id}` : "";
	const who = details.length
		? `${name || "Unnamed"} — ${details.join(", ")}`
		: name || "Unnamed";
	return `New contact (${source}): ${who}.${link}`;
}

async function post(url: string, text: string): Promise<boolean> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text }),
			signal: controller.signal,
		});
		if (!response.ok) {
			console.error(`[agent] RocketChat post failed: ${response.status}`);
			return false;
		}
		return true;
	} catch (error) {
		console.error(
			`[agent] RocketChat post failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		return false;
	} finally {
		clearTimeout(timer);
	}
}
