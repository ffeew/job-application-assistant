import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Documents use a serif and page shadow to distinguish them from tool sheets.
 */
function Paper({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="paper"
      className={cn(
        "bg-paper text-paper-foreground font-document shadow-page",
        className,
      )}
      {...props}
    />
  );
}

export { Paper };
