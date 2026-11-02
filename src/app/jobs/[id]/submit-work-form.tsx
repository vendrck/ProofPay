"use client";

import { useActionState } from "react";
import { submitWorkAction, type FormState } from "../actions";
import { FormError } from "../form-error";
import { SubmitButton } from "../submit-button";

export function SubmitWorkForm({ jobId }: { jobId: string }) {
  const [state, action] = useActionState(submitWorkAction.bind(null, jobId), {} as FormState);
  return (
    <form action={action} className="form">
      <FormError error={state.error} />
      <label>
        Pull request URL
        <input
          name="prUrl"
          type="url"
          required
          defaultValue={state.values?.prUrl}
          placeholder="https://github.com/acme/site/pull/42"
        />
        <span className="hint">Public GitHub repositories only. Verification runs in the background.</span>
      </label>
      <SubmitButton pending="Fetching the pull request…">Submit for verification</SubmitButton>
    </form>
  );
}
