import { cn } from "@/lib/utils";

interface FormFieldErrorProps {
  message?: string;
  className?: string;
}

function FormFieldError({ message, className }: FormFieldErrorProps) {
  if (!message) return null;
  return (
    <p className={cn("text-sm text-destructive mt-1", className)}>
      {message}
    </p>
  );
}

export { FormFieldError };
