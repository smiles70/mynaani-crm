"use client";

import { signIn } from "@crm/auth/client";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Label } from "@crm/ui/components/label";
import { Spinner } from "@crm/ui/components/spinner";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { normalizeSignInIdentifier } from "@/lib/sign-in-identifier";

export function MagicLinkSignIn() {
	const [pending, setPending] = useState(false);
	const [sent, setSent] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);

		const data = new FormData(event.currentTarget);
		const email = normalizeSignInIdentifier(String(data.get("email") ?? ""));

		const { error } = await signIn.magicLink({
			email,
			callbackURL: `${window.location.origin}/`,
		});

		setPending(false);
		if (error) {
			toast.error("We could not send a sign-in link right now.");
			return;
		}
		setSent(true);
	}

	if (sent) {
		return (
			<div className="flex flex-col gap-2 rounded-md border p-4">
				<p className="text-sm">
					If that email is allowed, a sign-in link is on its way. Open it on
					this device to continue.
				</p>
				<p className="text-sm text-muted-foreground">
					The link works once and expires in 10 minutes.
				</p>
			</div>
		);
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				handleSubmit(event).catch(() => {
					setPending(false);
					toast.error("Could not reach the sign-in service.");
				});
			}}
		>
			<div className="flex flex-col gap-2">
				<Label htmlFor="magic-email">Email</Label>
				<Input
					autoComplete="email"
					id="magic-email"
					name="email"
					required
					type="email"
				/>
			</div>
			<Button
				className="w-full"
				disabled={pending}
				type="submit"
				variant="secondary"
			>
				{pending ? <Spinner data-icon="inline-start" /> : null}
				Email me a sign-in link
			</Button>
		</form>
	);
}
