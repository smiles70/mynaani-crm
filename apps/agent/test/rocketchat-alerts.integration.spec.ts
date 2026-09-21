import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test";
import { db } from "@crm/db";
import { sweepNewContactAlerts } from "../agent/lib/rocketchat";

const suffix = process.env.TEST_RUN_ID ?? "rc-alerts-spec";
const mailHost = `@rc-alert.${suffix}.test`;
const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_URL = process.env.ROCKETCHAT_WEBHOOK_URL;

function stubWebhook() {
	const texts: string[] = [];
	globalThis.fetch = mock(
		async (_url: string | URL, init?: RequestInit) => {
			if (init?.body) texts.push(String(init.body));
			return new Response("ok", { status: 200 });
		},
	) as unknown as typeof fetch;
	return texts;
}

async function seed(count: number, alerted: boolean): Promise<string[]> {
	const ids: string[] = [];
	for (let i = 0; i < count; i += 1) {
		const data: Parameters<typeof db.contact.create>[0]["data"] = {
			firstName: `RcAlert${i}`,
			email: `rc-${i}${mailHost}`,
			source: "TRACKING",
		};
		if (alerted) data.alertedAt = new Date();
		const contact = await db.contact.create({
			data,
			select: { id: true },
		});
		ids.push(contact.id);
	}
	return ids;
}

beforeEach(async () => {
	await db.contact.deleteMany({ where: { email: { endsWith: mailHost } } });
	process.env.ROCKETCHAT_WEBHOOK_URL = "https://rc-spec.test/hooks/x";
});

afterEach(() => {
	globalThis.fetch = ORIGINAL_FETCH;
	if (ORIGINAL_URL === undefined) {
		delete process.env.ROCKETCHAT_WEBHOOK_URL;
	} else {
		process.env.ROCKETCHAT_WEBHOOK_URL = ORIGINAL_URL;
	}
});

afterAll(async () => {
	await db.contact.deleteMany({ where: { email: { endsWith: mailHost } } });
});

describe("sweepNewContactAlerts", () => {
	it("alerts once per contact and stamps alertedAt", async () => {
		const ids = await seed(2, false);
		const texts = stubWebhook();

		const first = await sweepNewContactAlerts();
		expect(first).toBe(2);
		expect(texts.length).toBe(2);

		const stamped = await db.contact.findMany({
			where: { id: { in: ids }, alertedAt: { not: null } },
			select: { id: true },
		});
		expect(stamped).toHaveLength(2);

		const second = await sweepNewContactAlerts();
		expect(second).toBe(0);
		expect(texts.length).toBe(2);
	});

	it("does not alert contacts that are already stamped", async () => {
		await seed(1, true);
		const texts = stubWebhook();

		expect(await sweepNewContactAlerts()).toBe(0);
		expect(texts).toHaveLength(0);
	});

	it("leaves unalerted rows for retry after a failed post", async () => {
		const ids = await seed(1, false);
		globalThis.fetch = mock(
			async () => new Response("nope", { status: 500 }),
		) as unknown as typeof fetch;

		expect(await sweepNewContactAlerts()).toBe(0);

		const row = await db.contact.findUnique({
			where: { id: ids[0] ?? "" },
			select: { alertedAt: true },
		});
		expect(row?.alertedAt).toBeNull();
	});

	it("drains a backlog across sweeps, oldest first", async () => {
		await seed(12, false);
		const texts = stubWebhook();

		const first = await sweepNewContactAlerts();
		const second = await sweepNewContactAlerts();
		expect(first + second).toBe(12);
		expect(texts.length).toBe(12);
	});
});
