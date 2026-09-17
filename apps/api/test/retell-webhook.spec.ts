import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";

const fallback = (key: string, value: string) => {
	if (!process.env[key]) {
		process.env[key] = value;
	}
};

fallback(
	"DATABASE_URL",
	"postgresql://postgres:postgres@localhost:5432/crm?schema=public",
);
fallback("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters-long");
fallback("API_URL", "http://localhost:3001");
fallback("ALLOWED_SIGN_IN", "example.com");
fallback("GOOGLE_CLIENT_ID", "test-google-client-id");
fallback("GOOGLE_CLIENT_SECRET", "test-google-client-secret");

const KEY = "key_webhook_test_0001";

function sign(body: string, key = KEY): string {
	const timestamp = Date.now().toString();
	const digest = createHmac("sha256", key)
		.update(body + timestamp)
		.digest("hex");
	return `v=${timestamp},d=${digest}`;
}

describe("Retell webhook", () => {
	let app: INestApplication;
	const previous = process.env.RETELL_API_KEY;

	beforeAll(async () => {
		process.env.RETELL_API_KEY = KEY;
		const { createApp } = await import("../src/create-app");
		app = await createApp();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
		if (previous === undefined) delete process.env.RETELL_API_KEY;
		else process.env.RETELL_API_KEY = previous;
	});

	it("rejects a request with no signature", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/retell/webhook")
			.set("content-type", "application/json")
			.send(JSON.stringify({ event: "call_ended", call: { call_id: "x" } }));

		expect(response.status).toBe(401);
	});

	it("rejects a request signed with the wrong key", async () => {
		const body = JSON.stringify({
			event: "call_ended",
			call: { call_id: "call_wrong_key" },
		});
		const response = await request(app.getHttpServer())
			.post("/api/retell/webhook")
			.set("content-type", "application/json")
			.set("x-retell-signature", sign(body, "key_not_the_real_one"))
			.send(body);

		expect(response.status).toBe(401);
	});

	it("rejects a stale signature", async () => {
		const body = JSON.stringify({
			event: "call_ended",
			call: { call_id: "call_stale" },
		});
		const old = (Date.now() - 10 * 60 * 1000).toString();
		const digest = createHmac("sha256", KEY)
			.update(body + old)
			.digest("hex");

		const response = await request(app.getHttpServer())
			.post("/api/retell/webhook")
			.set("content-type", "application/json")
			.set("x-retell-signature", `v=${old},d=${digest}`)
			.send(body);

		expect(response.status).toBe(401);
	});

	it("accepts a correctly signed call_ended and stores the event", async () => {
		const body = JSON.stringify({
			event: "call_ended",
			call: {
				call_id: "call_spec_001",
				from_number: "+18775550199",
				transcript: "Agent: hello. User: interested in a demo.",
			},
		});
		const response = await request(app.getHttpServer())
			.post("/api/retell/webhook")
			.set("content-type", "application/json")
			.set("x-retell-signature", sign(body))
			.send(body);

		expect(response.status).toBe(204);
	});

	it("treats a replayed event as a no-op", async () => {
		const body = JSON.stringify({
			event: "call_ended",
			call: {
				call_id: "call_spec_replay",
				from_number: "+18775550200",
			},
		});
		const first = await request(app.getHttpServer())
			.post("/api/retell/webhook")
			.set("content-type", "application/json")
			.set("x-retell-signature", sign(body))
			.send(body);
		const second = await request(app.getHttpServer())
			.post("/api/retell/webhook")
			.set("content-type", "application/json")
			.set("x-retell-signature", sign(body))
			.send(body);

		expect(first.status).toBe(204);
		expect(second.status).toBe(204);
	});
});
