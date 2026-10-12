"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { authClient } from "@/app/utils/authClient";
import { AuthPanel } from "../components/auth-panel";

export default function SignInPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			await authClient.signIn.email({
				email,
				password,
			});

			// Allow the client session state to settle before checking it.
			await new Promise((resolve) => setTimeout(resolve, 500));

			const session = await authClient.getSession();
			if (session.data?.user) {
				router.push("/dashboard");
			} else {
				setError("Email or password is incorrect.");
				setIsLoading(false);
			}
		} catch {
			setError("Couldn't reach the server. Check your connection and try again.");
			setIsLoading(false);
		}
	};

	return (
		<AuthPanel
			title="Sign in"
			footer={
				<>
					<p>
						<Link href="/forgot-password">Forgot your password?</Link>
					</p>
					<p>
						No account yet? <Link href="/sign-up">Create one</Link>
					</p>
				</>
			}
		>
			<form onSubmit={withAsyncHandler(handleSubmit)} className="flex flex-col gap-4">
				{error && <Notice tone="error">{error}</Notice>}
				<div className="flex flex-col gap-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						autoComplete="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
					{isLoading ? "Signing in…" : "Sign in"}
				</Button>
			</form>
		</AuthPanel>
	);
}
