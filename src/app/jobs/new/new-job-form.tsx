"use client";

import { useActionState } from "react";
import { createJobAction, type FormState } from "../actions";
import { FormError } from "../form-error";
import { SubmitButton } from "../submit-button";

export function NewJobForm() {
  const [state, action] = useActionState(createJobAction, {} as FormState);
  const v = state.values ?? {};
  return (
    <form action={action} className="form">
      <FormError error={state.error} />
      <label>
        Title
        <input name="title" required maxLength={120} defaultValue={v.title} placeholder="Dark mode for the marketing site" />
      </label>
      <label>
        Brief
        <textarea
          name="brief"
          required
          rows={6}
          defaultValue={v.brief}
          placeholder="Add a dark mode toggle to the navbar. Theme colours must cover cards and buttons. All CI checks must pass."
        />
      </label>
      <div className="row">
        <label>
          Amount
          <input name="amount" required inputMode="decimal" defaultValue={v.amount} placeholder="100.00" />
        </label>
        <label>
          Currency
          <select name="currency" defaultValue={v.currency ?? "USD"} key={v.currency}>
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
          </select>
        </label>
      </div>
      <label>
        <span>
          GitHub repository <span className="muted">(optional)</span>
        </span>
        <input name="repoUrl" type="url" defaultValue={v.repoUrl} placeholder="https://github.com/acme/site" />
      </label>
      <SubmitButton pending="Drafting criteria…">Create job</SubmitButton>
    </form>
  );
}
