import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A document surface: resume previews and letters. Square corners, paper
 * shadow and the document serif set it apart from flat tool panels (Card).
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
