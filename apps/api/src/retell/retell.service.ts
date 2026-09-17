import { createHmac, timingSafeEqual } from "node:crypto";
import { ActivityType, type Db, Prisma, RecordSource } from "@crm/db";
import type {
	RetellCall,
	RetellChat,
	RetellWebhook,
} from "@crm/validation/retell-webhook";
import {
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import type { EnvironmentVariables } from "../config/env.validation";
import { ActivityStampService } from "../crm/activity-stamp.service";
import { normalizeEmail } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import { splitName } from "../mailbox/participants";

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const NOTE_BODY_LIMIT = 4_000;

const FILEABLE_EVENTS = new Set([
	"call_ended",
	"call_analyzed",
	"chat_ended",
	"chat_analyzed",
]);

type Identity = {
	email: string | null;
	phone: string | null;
	name: string | null;
};

@Injectable()
export class RetellService {
	private readonly logger = new Logger(RetellService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly config: ConfigService<EnvironmentVariables, true>,
		private readonly agent: AgentTriggerService,
		private readonly stamp: ActivityStampService,
	) {}

	verify(rawBody: string, signature: string | string[] | undefined): boolean {
		const key = this.config.get("RETELL_API_KEY", { infer: true });
		if (!key) {
			throw new ServiceUnavailableException("Retell intake is not configured");
		}

		if (typeof signature !== "string") return false;
		const match = /^v=(\d+),d=([0-9a-f]+)$/i.exec(signature);
		if (!match?.[1] || !match[2]) return false;

		const timestamp = Number(match[1]);
		if (!Number.isFinite(timestamp)) return false;
		if (Math.abs(Date.now() - timestamp) > SIGNATURE_TOLERANCE_MS) {
			return false;
		}

		const expected = createHmac("sha256", key)
			.update(rawBody + match[1])
			.digest("hex");

		const given = Buffer.from(match[2], "hex");
		const wanted = Buffer.from(expected, "hex");
		if (given.length !== wanted.length) return false;

		return timingSafeEqual(given, wanted);
	}

	async accept(webhook: RetellWebhook): Promise<void> {
		const isCall = "call" in webhook;
		const session = isCall ? webhook.call : webhook.chat;
		const sessionId = isCall
			? (session as RetellCall).call_id
			: (session as RetellChat).chat_id;
		const eventKey = `${webhook.event}:${sessionId}`;

		let stored: { id: string; filedAt: Date | null };
		try {
			stored = await this.db.retellEvent.create({
				data: {
					eventKey,
					event: webhook.event,
					callId: sessionId,
					payload: webhook as Prisma.InputJsonValue,
				},
				select: { id: true, filedAt: true },
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				return;
			}
			throw error;
		}

		if (!FILEABLE_EVENTS.has(webhook.event)) {
			await this.skip(stored.id, "Lifecycle event only");
			return;
		}

		const identity = identityOf(webhook);
		if (!identity.email && !identity.phone) {
			await this.skip(stored.id, "No identifiable caller");
			return;
		}

		const contactId = await this.findOrCreate(identity);
		await this.claim(stored.id, contactId);
		await this.note(contactId, webhook);

		await this.agent.contactCreated(
			contactId,
			isCall ? "Called the Retell line" : "Messaged the Retell chat",
		);

		this.logger.log({
			message: "Contact filed from a Retell event",
			contactId,
			event: webhook.event,
		});
	}

	private async findOrCreate(identity: Identity): Promise<string> {
		const existing = await this.db.contact.findFirst({
			where: {
				archivedAt: null,
				OR: [
					...(identity.email
						? [
								{
									email: {
										equals: identity.email,
										mode: "insensitive" as const,
									},
								},
							]
						: []),
					...(identity.phone ? [{ phone: identity.phone }] : []),
				],
			},
			select: { id: true },
		});

		if (existing) {
			await this.db.contact.update({
				where: { id: existing.id },
				data: {
					lastActivityAt: new Date(),
					...(identity.phone ? { phone: identity.phone } : {}),
				},
			});
			return existing.id;
		}

		const name = splitName(identity.name, identity.email ?? "caller@unknown");
		const created = await this.db.contact.create({
			data: {
				firstName: name.firstName,
				lastName: name.lastName,
				email: identity.email,
				phone: identity.phone,
				source: RecordSource.RETELL,
				lastActivityAt: new Date(),
			},
			select: { id: true },
		});

		return created.id;
	}

	private async note(contactId: string, webhook: RetellWebhook): Promise<void> {
		const author = await this.author(contactId);
		if (!author) return;

		const isCall = "call" in webhook;
		const session = isCall ? webhook.call : webhook.chat;
		const summary = isCall
			? (session as RetellCall).call_analysis?.call_summary
			: (session as RetellChat).chat_analysis?.call_summary;
		const transcript = session.transcript?.slice(0, NOTE_BODY_LIMIT);
		const body = summary ?? transcript ?? "No transcript captured";

		const activity = await this.db.activity.create({
			data: {
				type: ActivityType.NOTE,
				subject: isCall ? "Call with the Retell line" : "Retell chat session",
				body,
				contactId,
				occurredAt: new Date(),
				createdById: author,
				meta: {
					automated: true,
					source: "retell",
					event: webhook.event,
				},
			},
			select: { createdAt: true },
		});

		await this.stamp.touch({ contactId }, activity.createdAt);
	}

	private async claim(eventId: string, contactId: string): Promise<void> {
		await this.db.retellEvent.updateMany({
			where: { id: eventId, filedAt: null },
			data: { contactId, filedAt: new Date(), skipReason: null },
		});
	}

	private async skip(eventId: string, reason: string): Promise<void> {
		await this.db.retellEvent.update({
			where: { id: eventId },
			data: { skipReason: reason },
		});
		this.logger.log({
			message: "Retell event skipped",
			eventId,
			reason,
		});
	}

	private async author(contactId: string): Promise<string | null> {
		const contact = await this.db.contact.findUnique({
			where: { id: contactId },
			select: { ownerId: true },
		});

		if (contact?.ownerId) return contact.ownerId;

		const anyUser = await this.db.user.findFirst({ select: { id: true } });
		return anyUser?.id ?? null;
	}
}

function identityOf(webhook: RetellWebhook): Identity {
	const session = "call" in webhook ? webhook.call : webhook.chat;
	const bag = {
		...session.metadata,
		...session.collected_dynamic_variables,
	} as Record<string, unknown>;

	const identity: Identity = { email: null, phone: null, name: null };

	for (const value of Object.values(bag)) {
		if (typeof value !== "string") continue;
		const email = normalizeEmail(value);
		if (email) {
			identity.email ??= email;
		}
	}

	for (const [key, value] of Object.entries(bag)) {
		if (typeof value !== "string") continue;
		const lower = key.toLowerCase();
		if (!identity.email && /mail/.test(lower)) {
			identity.email = normalizeEmail(value);
		}
		if (!identity.phone && /phone|tel|number/.test(lower)) {
			identity.phone = normalizePhone(value);
		}
		if (!identity.name && /name/.test(lower)) {
			identity.name = value.trim();
		}
	}

	if ("call" in webhook) {
		const call = webhook.call as RetellCall;
		identity.phone ??= normalizePhone(call.from_number ?? "");
	}

	return identity;
}

function normalizePhone(value: string): string | null {
	const digits = value.replace(/[^\d+]/g, "");
	return digits.length >= 7 && digits.length <= 16 ? digits : null;
}
