"use client";

import { useActionState } from "react";
import { acceptInviteAction, type FormState } from "@/app/jobs/actions";
import { FormError } from "@/app/jobs/form-error";
import { SubmitButton } from "@/app/jobs/submit-button";

export function AcceptInviteForm({ jobId, defaultEmail }: { jobId: string; defaultEmail: string }) {
  const [state, action] = useActionState(acceptInviteAction.bind(null, jobId), {} as FormState);
  return (
    <form action={action} className="form">
      <FormError error={state.error} />
      <label>
        PayPal email for the payout
        <input name="paypalEmail" type="email" required defaultValue={state.values?.paypalEmail ?? defaultEmail} />
        <span className="hint">When the work is released, PayPal pays out to this address.</span>
      </label>
      <SubmitButton pending="Accepting…">Accept the job</SubmitButton>
    </form>
  );
}
