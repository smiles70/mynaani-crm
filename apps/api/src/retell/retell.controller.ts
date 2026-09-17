import type { IncomingMessage } from "node:http";
import { retellWebhook } from "@crm/validation/retell-webhook";
import {
	Controller,
	HttpCode,
	Logger,
	Post,
	Req,
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common";
import {
	ApiExcludeEndpoint,
	ApiNoContentResponse,
	ApiOperation,
	ApiServiceUnavailableResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { z } from "zod";
import { RetellService } from "./retell.service";

const MAX_BODY_BYTES = 256 * 1024;

const parsedBody = z
	.union([
		z.string().transform((text) => ({ text, json: null })),
		z
			.union([z.array(z.json()), z.looseObject({})])
			.transform((json) => ({ text: null, json })),
	])
	.nullable()
	.catch(null);

const requestShape = z.object({ body: parsedBody }).catch({ body: null });

@ApiTags("Retell")
@Controller("api/retell")
export class RetellController {
	private readonly logger = new Logger(RetellController.name);

	constructor(private readonly retell: RetellService) {}

	@Post("webhook")
	@AllowAnonymous()
	@HttpCode(204)
	@ApiOperation({
		summary: "Receive a Retell call/chat lifecycle webhook",
	})
	@ApiNoContentResponse({ description: "Event accepted or already seen." })
	@ApiUnauthorizedResponse({ description: "Bad or stale signature." })
	@ApiServiceUnavailableResponse({
		description: "Retell intake is not configured on this deployment.",
	})
	@ApiExcludeEndpoint()
	async webhook(@Req() request: IncomingMessage): Promise<void> {
		const raw = await read(request, MAX_BODY_BYTES);
		if (!raw) throw new UnauthorizedException("Missing body");

		const signature = request.headers["x-retell-signature"];
		if (!this.retell.verify(raw, signature)) {
			throw new UnauthorizedException("Invalid signature");
		}

		let parsed: ReturnType<typeof retellWebhook.safeParse>;
		try {
			parsed = retellWebhook.safeParse(JSON.parse(raw));
		} catch {
			throw new UnauthorizedException("Unreadable body");
		}
		if (!parsed.success) return;

		try {
			await this.retell.accept(parsed.data);
		} catch (error) {
			if (error instanceof ServiceUnavailableException) throw error;
			this.logger.error(
				{ message: "Retell event was not stored" },
				error instanceof Error ? error.stack : String(error),
			);
		}
	}
}

async function read(
	request: IncomingMessage,
	limit: number,
): Promise<string | null> {
	const existing = requestShape.parse(request).body;

	if (existing !== null) {
		if (existing.text !== null) {
			return existing.text.length > limit ? null : existing.text;
		}

		return JSON.stringify(existing.json);
	}

	return new Promise((resolve) => {
		const chunks: Buffer[] = [];
		let size = 0;
		let settled = false;

		const finish = (value: string | null) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		request.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > limit) {
				request.destroy();
				finish(null);
				return;
			}
			chunks.push(chunk);
		});
		request.on("end", () => finish(Buffer.concat(chunks).toString("utf8")));
		request.on("error", () => finish(null));
		request.on("close", () => finish(null));
	});
}
