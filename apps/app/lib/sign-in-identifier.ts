const STAFF_DOMAIN = "mindbyndr.com";

export function normalizeSignInIdentifier(identifier: string): string {
	const value = identifier.trim().toLowerCase();
	return value.includes("@") ? value : `${value}@${STAFF_DOMAIN}`;
}
