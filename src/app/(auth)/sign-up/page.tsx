"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { useQueryClient } from "@tanstack/react-query";
import { clearAccountState } from "@/app/utils/account-state";
import { authClient } from "@/app/utils/authClient";
import { useRouter } from "next/navigation";
import { AuthPanel } from "../components/auth-panel";

export default function SignUpPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();
	const queryClient = useQueryClient();

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		if (password !== confirmPassword) {
			setError("The two passwords don't match.");
			setIsLoading(false);
			return;
		}

		if (password.length < 8) {
			setError("Use at least 8 characters for the password.");
			setIsLoading(false);
			return;
		}

		try {
			const { error: signUpError } = await authClient.signUp.email({
				email,
				password,
				name,
			});

			if (signUpError) {
				setError(
					signUpError.status === 422
						? "Couldn't create the account. That email may already be registered."
						: signUpError.status === 429
							? "Too many attempts. Wait a minute, then try again."
							: "Couldn't create the account. Try again in a moment.",
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
			title="Create account"
			description="Add your experience once. Every resume is built from it."
			footer={
				<p>
					Already have an account? <Link href="/sign-in">Sign in</Link>
				</p>
			}
		>
			<form onSubmit={withAsyncHandler(handleSubmit)} className="flex flex-col gap-4">
				{error && <Notice tone="error">{error}</Notice>}
				<div className="flex flex-col gap-2">
					<Label htmlFor="name">Full name</Label>
					<Input
						id="name"
						type="text"
						autoComplete="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>
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
						autoComplete="new-password"
						aria-describedby="password-hint"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
					<p id="password-hint" className="text-muted-foreground text-sm">
						At least 8 characters.
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="confirmPassword">Confirm password</Label>
					<Input
						id="confirmPassword"
						type="password"
						autoComplete="new-password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
					/>
				</div>
				<Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
					{isLoading ? "Creating account…" : "Create account"}
				</Button>
			</form>
		</AuthPanel>
	);
}
