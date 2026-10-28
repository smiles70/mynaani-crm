"use client";

import { Button } from "@crm/ui/components/button";
import { useState } from "react";

export function MagicLinkConfirm({ verifyPath }: { verifyPath: string }) {
	const [busy, setBusy] = useState(false);

	return (
		<Button
			className="w-full"
			disabled={busy}
			onClick={() => {
				setBusy(true);
				window.location.assign(verifyPath);
			}}
		>
			{busy ? "Signing in…" : "Sign in"}
		</Button>
	);
}
