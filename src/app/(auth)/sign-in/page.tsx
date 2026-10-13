"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { useQueryClient } from "@tanstack/react-query";
import { clearAccountState } from "@/app/utils/account-state";
import { authClient } from "@/app/utils/authClient";
import { AuthPanel } from "../components/auth-panel";

export default function SignInPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const { error: signInError } = await authClient.signIn.email({
				email,
				password,
			});

			if (signInError) {
				setError(
					signInError.status === 401
						? "Email or password is incorrect."
						: signInError.status === 429
							? "Too many attempts. Wait a minute, then try again."
							: "Couldn't sign you in. Try again in a moment.",
				);
				setIsLoading(false);
				return;
			}

			// Another account may have used this browser tab before this one.
			clearAccountState(queryClient);
			router.push("/dashboard");
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
