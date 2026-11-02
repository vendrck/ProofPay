"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthError, logIn, signUp } from "@/server/auth/accounts";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/server/auth/password";
import { endSession, safeNext, startSession } from "@/server/auth/session";

export interface AuthFormState {
  error?: string;
  values?: { email?: string; name?: string };
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.email("Enter a valid email").max(200),
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters for the password`)
    .max(PASSWORD_MAX, "That password is too long"),
});

function failure(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  console.error(err);
  return "Something went wrong. Try again.";
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? ""), name: String(formData.get("name") ?? "") };
  const parsed = signUpSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input", values };
  try {
    await startSession(await signUp(parsed.data));
  } catch (err) {
    return { error: failure(err), values };
  }
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function logInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };
  try {
    await startSession(await logIn(email, password.slice(0, PASSWORD_MAX)));
  } catch (err) {
    return { error: failure(err), values: { email } };
  }
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function logOutAction() {
  await endSession();
  redirect("/");
}
