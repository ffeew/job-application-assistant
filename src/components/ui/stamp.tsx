import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const stampVariants = cva("stamp", {
  variants: {
    frame: {
      single: "",
      // A second rule marks a final decision.
      double: "stamp-double",
    },
    size: {
      sm: "text-sm",
      md: "text-lg",
      lg: "text-2xl",
    },
  },
  defaultVariants: { frame: "single", size: "sm" },
});

interface StampProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof stampVariants> {
  /** Presses the stamp in. Use when it answers something the user just did. */
  pressed?: boolean;
}

/**
 * A verdict, rubber-stamped: an application's status or whether a resume fits
 * its page target. Set the ink with a text colour. Stamps belong on paper,
 * where every ink passes contrast.
 */
function Stamp({
  className,
  frame,
  size,
  pressed = false,
  ...props
}: StampProps) {
  return (
    <span
      data-slot="stamp"
      className={cn(
        stampVariants({ frame, size }),
        pressed && "stamp-press",
        className,
      )}
      {...props}
    />
  );
}

export { Stamp };
