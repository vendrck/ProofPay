"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/app/jobs/form-error";
import { SubmitButton } from "@/app/jobs/submit-button";
import { type AuthFormState, logInAction, signUpAction } from "./actions";

/** Log-in and sign-up share one form; sign-up adds the name field. */
export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action] = useActionState(mode === "login" ? logInAction : signUpAction, {} as AuthFormState);
  const v = state.values ?? {};
  const other = mode === "login" ? "/signup" : "/login";
  return (
    <form action={action} className="form">
      <FormError error={state.error} />
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <label>
          Name
          <input name="name" required maxLength={80} autoComplete="name" defaultValue={v.name} />
        </label>
      )}
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" defaultValue={v.email} />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 10 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "signup" && <span className="hint">At least 10 characters.</span>}
      </label>
      <SubmitButton pending={mode === "login" ? "Logging in…" : "Creating account…"}>
        {mode === "login" ? "Log in" : "Create account"}
      </SubmitButton>
      <p className="small muted" style={{ margin: 0 }}>
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={`${other}?next=${encodeURIComponent(next)}`}>{mode === "login" ? "Create an account" : "Log in"}</Link>
      </p>
    </form>
  );
}
