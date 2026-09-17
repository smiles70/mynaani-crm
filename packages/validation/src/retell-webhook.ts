import { z } from "zod";

const text = z.string().trim().max(64_000);

const analysis = z
	.object({
		call_summary: text.optional(),
		user_sentiment: text.optional(),
		custom_analysis_data: z.record(z.string(), z.json()).optional(),
	})
	.loose()
	.optional();

const call = z
	.object({
		call_id: z.string().trim().min(1).max(120),
		agent_id: z.string().trim().max(120).optional(),
		from_number: text.optional(),
		to_number: text.optional(),
		direction: text.optional(),
		call_status: text.optional(),
		start_timestamp: z.number().optional(),
		end_timestamp: z.number().optional(),
		transcript: text.optional(),
		metadata: z.record(z.string(), z.json()).optional(),
		collected_dynamic_variables: z.record(z.string(), z.json()).optional(),
		call_analysis: analysis,
	})
	.loose();

const chat = z
	.object({
		chat_id: z.string().trim().min(1).max(120),
		agent_id: z.string().trim().max(120).optional(),
		chat_status: text.optional(),
		chat_type: text.optional(),
		start_timestamp: z.number().optional(),
		end_timestamp: z.number().optional(),
		transcript: text.optional(),
		metadata: z.record(z.string(), z.json()).optional(),
		collected_dynamic_variables: z.record(z.string(), z.json()).optional(),
		chat_analysis: analysis,
	})
	.loose();

export const retellWebhook = z.discriminatedUnion("event", [
	z.object({
		event: z.enum(["call_started", "call_ended", "call_analyzed"]),
		call,
	}),
	z.object({
		event: z.enum(["chat_started", "chat_ended", "chat_analyzed"]),
		chat,
	}),
]);

export type RetellWebhook = z.infer<typeof retellWebhook>;
export type RetellCall = z.infer<typeof call>;
export type RetellChat = z.infer<typeof chat>;
