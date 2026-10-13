import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Translucent ink reads on both the folder and its sheets.
      className={cn("animate-pulse rounded-md bg-foreground/10", className)}
      aria-busy="true"
      aria-live="polite"
      role="status"
      {...props}
    />
  );
}

export { Skeleton };
