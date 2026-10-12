import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** An open folder with the outline of the sheet that is not in it yet. */
function EmptyFolder() {
  return (
    <svg
      viewBox="0 0 96 72"
      aria-hidden="true"
      className="hidden w-24 shrink-0 sm:block"
      fill="none"
      stroke="var(--kraft)"
      strokeWidth="1.5"
    >
      <path
        d="M3 13a4 4 0 0 1 4-4h23l7 8h48a4 4 0 0 1 4 4v44a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"
        fill="var(--tab)"
      />
      <rect x="17" y="21" width="58" height="30" rx="1" strokeDasharray="4 4" />
      <path
        d="M3 36h90v29a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"
        fill="var(--background)"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  children,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-kraft flex items-center gap-6 rounded-lg border border-dashed px-6 py-8",
        className,
      )}
    >
      <EmptyFolder />
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {children && (
            <p className="text-muted-foreground max-w-[60ch] text-sm">
              {children}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
