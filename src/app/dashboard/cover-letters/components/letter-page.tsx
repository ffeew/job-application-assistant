import * as React from "react";
import { Paper } from "@/components/ui/paper";
import { cn } from "@/lib/utils";

export function LetterPage({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Paper className="has-[:focus-visible]:outline-ring px-6 py-8 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 sm:px-12 sm:py-12">
      <textarea
        rows={18}
        className={cn(
          // The page shows focus, so the field itself stays unframed.
          "placeholder:text-paper-foreground/50 block field-sizing-content min-h-[26rem] w-full max-w-[72ch] resize-none bg-transparent text-[1.0625rem] leading-[1.6] focus-visible:outline-none",
          className,
        )}
        {...props}
      />
    </Paper>
  );
}
