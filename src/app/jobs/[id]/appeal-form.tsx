"use client";

import { useActionState } from "react";
import { fileAppealAction, type FormState } from "../actions";
import { FormError } from "../form-error";
import { SubmitButton } from "../submit-button";

export function AppealForm({ jobId }: { jobId: string }) {
  const [state, action] = useActionState(fileAppealAction.bind(null, jobId), {} as FormState);
  const v = state.values ?? {};
  return (
    <form action={action} className="form">
      <FormError error={state.error} />
      <label>
        I am the
        <select name="raisedBy" defaultValue={v.raisedBy ?? "freelancer"} key={v.raisedBy}>
          <option value="freelancer">Freelancer</option>
          <option value="client">Client</option>
        </select>
      </label>
      <label>
        Reason
        <textarea
          name="reason"
          rows={4}
          required
          minLength={20}
          defaultValue={v.reason}
          placeholder="Which criterion is judged wrongly, and why?"
        />
      </label>
      <SubmitButton variant="secondary" pending="Filing appeal and drafting a ruling…">
        File appeal
      </SubmitButton>
    </form>
  );
}
