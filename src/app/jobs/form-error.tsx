/** Inline error for a `useActionState` form; announced to screen readers. */
export function FormError({ error }: { error?: string }) {
  return (
    <p className="alert alert-error" role="alert" hidden={!error}>
      {error}
    </p>
  );
}
