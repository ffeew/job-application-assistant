import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const stampVariants = cva("stamp", {
  variants: {
    frame: {
      single: "",
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
  extends React.ComponentProps<"span">, VariantProps<typeof stampVariants> {
  /** Animate verdicts in response to an action to avoid distracting idle motion. */
  pressed?: boolean;
}

/**
 * Stamps belong on paper, where every status ink passes contrast.
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
