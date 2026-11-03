interface ValidationErrorProps {
  message: string;
  errorKey: string;
  testId: string;
}

/** Shared, accessible presentation for form validation errors. */
export function ValidationError({ message, errorKey, testId }: ValidationErrorProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="validation-error"
      data-testid={testId}
      data-error-key={errorKey}
    >
      <span>{message}</span>
    </div>
  );
}
