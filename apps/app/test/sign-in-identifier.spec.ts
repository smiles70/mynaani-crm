import { describe, expect, it } from "bun:test";
import { normalizeSignInIdentifier } from "@/lib/sign-in-identifier";

describe("normalizeSignInIdentifier", () => {
	it("expands a bare name to the staff domain", () => {
		expect(normalizeSignInIdentifier("steven")).toBe("steven@mindbyndr.com");
		expect(normalizeSignInIdentifier("kim")).toBe("kim@mindbyndr.com");
	});

	it("is not case sensitive", () => {
		expect(normalizeSignInIdentifier("Steven")).toBe("steven@mindbyndr.com");
		expect(normalizeSignInIdentifier("KIM@MINDBYNDR.COM")).toBe(
			"kim@mindbyndr.com",
		);
	});

	it("trims whitespace", () => {
		expect(normalizeSignInIdentifier("  steven  ")).toBe(
			"steven@mindbyndr.com",
		);
	});

	it("leaves other domains alone", () => {
		expect(normalizeSignInIdentifier("Stmiles1@Yahoo.com")).toBe(
			"stmiles1@yahoo.com",
		);
	});
});
