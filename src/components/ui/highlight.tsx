import * as React from "react";

import { cn } from "@/lib/utils";

interface HighlightProps extends React.ComponentProps<"mark"> {
  /** `stroke` marks running text on paper; `chip` is a standalone tag. */
  variant?: "stroke" | "chip";
}

/** Marks content that was matched to the job. Reserve it for that meaning. */
function Highlight({ className, variant = "stroke", ...props }: HighlightProps) {
  return (
    <mark
      data-slot="highlight"
      className={cn(
        variant === "stroke"
          ? "highlight-stroke"
          : "bg-highlight text-highlight-foreground rounded-sm px-1.5 py-0.5",
        className,
      )}
      {...props}
    />
  );
}

export { Highlight };
