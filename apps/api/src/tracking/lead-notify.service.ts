import { Injectable, Logger } from "@nestjs/common";

const REQUEST_TIMEOUT_MS = 5_000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface FiledLead {
	contactId: string;
	email: string;
	name: string | null;
	host: string;
	path: string;
}

@Injectable()
export class LeadNotifyService {
	private readonly logger = new Logger(LeadNotifyService.name);

	async leadFiled(lead: FiledLead): Promise<void> {
		await this.email(lead);
	}

	private async email(lead: FiledLead): Promise<void> {
		const apiKey = process.env.RESEND_API_KEY?.trim();
		const to = process.env.LEAD_NOTIFY_TO?.trim();
		const from = process.env.LEAD_NOTIFY_FROM?.trim();
		if (!apiKey || !to || !from) return;

		const who = lead.name?.trim() || lead.email;

		try {
			const res = await fetch(RESEND_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					from,
					to: [to],
					subject: `New lead: ${who}`,
					text: `Name: ${who}\nEmail: ${lead.email}\nSource: ${lead.host}${lead.path}\nContact: ${lead.contactId}`,
				}),
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
			if (!res.ok) {
				this.logger.warn({
					message: "Lead notify email returned non-2xx",
					status: res.status,
					contactId: lead.contactId,
				});
			}
		} catch (error) {
			this.logger.warn({
				message: "Lead notify email failed",
				contactId: lead.contactId,
				error: String(error),
			});
		}
	}
}
