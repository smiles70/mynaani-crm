import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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

export default function MagicLinkConfirmPage({
	searchParams,
}: PageProps<"/sign-in/magic-confirm">) {
	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading title="Confirm your sign in" description="One moment." />
				}
			>
				<Confirm searchParams={searchParams} />
			</Suspense>
		</AuthShell>
	);
}

async function Confirm({
	searchParams,
}: Pick<PageProps<"/sign-in/magic-confirm">, "searchParams">) {
	const params = await searchParams;

	const verify = new URLSearchParams();
	for (const key of FORWARDED) {
		const raw = params[key];
		const value = Array.isArray(raw) ? raw.at(0) : raw;
		if (value) verify.set(key, value);
	}

	if (!verify.get("token")) {
		return (
			<>
				<AuthHeading
					title="That link did not work"
					description="It was missing its sign-in token, so nothing was signed in."
				/>
				<p className="text-center text-muted-foreground text-sm/5">
					<Link href="/sign-in">Request a new sign-in link</Link>
				</p>
			</>
		);
	}

	return (
		<>
			<AuthHeading
				title="Confirm your sign in"
				description="Press the button below to finish signing in. This uses your link once."
			/>
			<MagicLinkConfirm
				verifyPath={`/api/auth/magic-link/verify?${verify.toString()}`}
			/>
		</>
	);
}
