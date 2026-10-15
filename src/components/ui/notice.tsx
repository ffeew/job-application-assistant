import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const noticeVariants = cva(
  "bg-card text-card-foreground flex flex-col gap-1 rounded-md border border-l-4 px-4 py-3 text-sm",
  {
    variants: {
      tone: {
        info: "border-l-link",
        warning: "border-l-warning",
        error: "border-l-destructive",
        success: "border-l-success",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

interface NoticeProps
  extends
    Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof noticeVariants> {
  title?: React.ReactNode;
}

/**
 * Use `role="status"` for action results so assistive technology announces
 * updates; errors already use the more urgent alert role.
 */
function Notice({
  className,
  tone = "info",
  title,
  children,
  role,
  ...props
}: NoticeProps) {
  return (
    <div
      data-slot="notice"
      role={role ?? (tone === "error" ? "alert" : undefined)}
      className={cn(noticeVariants({ tone }), className)}
      {...props}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className="text-muted-foreground [&_a]:text-link [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </div>
  );
}

export { Notice };
