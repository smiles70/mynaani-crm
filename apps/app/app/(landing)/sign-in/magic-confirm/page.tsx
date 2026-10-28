import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { MagicLinkConfirm } from "./magic-link-confirm";

export const metadata: Metadata = {
	title: "Confirm sign in",
};

const FORWARDED = [
	"token",
	"callbackURL",
	"errorCallbackURL",
	"newUserCallbackURL",
] as const;

export default async function MagicLinkConfirmPage({
	searchParams,
}: PageProps<"/sign-in/magic-confirm">) {
	const params = await searchParams;

	const verify = new URLSearchParams();
	for (const key of FORWARDED) {
		const value = params[key];
		if (typeof value === "string" && value.length > 0) {
			verify.set(key, value);
		}
	}

	const token = verify.get("token");
	if (!token) {
		return (
			<AuthShell>
				<AuthHeading
					title="That link did not work"
					description="It was missing its sign-in token, so nothing was signed in."
				/>
				<p className="text-center text-muted-foreground text-sm/5">
					<Link href="/sign-in">Request a new sign-in link</Link>
				</p>
			</AuthShell>
		);
	}

	return (
		<AuthShell>
			<AuthHeading
				title="Confirm your sign in"
				description="Press the button below to finish signing in. This uses your link once."
			/>
			<MagicLinkConfirm
				verifyPath={`/api/auth/magic-link/verify?${verify.toString()}`}
			/>
		</AuthShell>
	);
}
