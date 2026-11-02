"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Disables itself while the form's server action runs (AI calls take a while). */
export function SubmitButton({
  children,
  pending,
  variant = "primary",
  block = false,
}: {
  children: ReactNode;
  pending: string;
  variant?: "primary" | "secondary" | "link" | "paypal";
  block?: boolean;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant}${block ? " btn-block" : ""}`} disabled={isPending} aria-busy={isPending}>
      {isPending ? pending : children}
    </button>
  );
}
