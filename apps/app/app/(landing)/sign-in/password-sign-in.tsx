"use client";

import { signIn } from "@crm/auth/client";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Label } from "@crm/ui/components/label";
import { Spinner } from "@crm/ui/components/spinner";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { normalizeSignInIdentifier } from "@/lib/sign-in-identifier";

export function PasswordSignIn() {
	const [pending, setPending] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);

		const data = new FormData(event.currentTarget);
		const email = normalizeSignInIdentifier(
			String(data.get("identifier") ?? ""),
		);
		const password = String(data.get("password") ?? "");

		const { error } = await signIn.email({
			email,
			password,
			callbackURL: `${window.location.origin}/`,
		});

		if (error) {
			setPending(false);
			toast.error(error.message ?? "That sign-in did not work.");
		}
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
				<Label htmlFor="identifier">Email or name</Label>
				<Input
					autoComplete="username"
					id="identifier"
					name="identifier"
					placeholder="steven@mindbyndr.com"
					required
					type="text"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor="password">Password</Label>
				<Input
					autoComplete="current-password"
					id="password"
					name="password"
					required
					type="password"
				/>
			</div>
			<Button className="w-full" disabled={pending} type="submit">
				{pending ? <Spinner data-icon="inline-start" /> : null}
				Sign in
			</Button>
		</form>
	);
}
