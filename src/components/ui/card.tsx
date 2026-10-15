import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A plain sheet in the folder, for tables, lists and grouped settings. The
// shadow carries the edge, so there is no border. Documents use Paper.
const cardVariants = cva(
  "bg-card text-card-foreground rounded-lg shadow-sheet",
  {
    variants: {
      layout: {
        default: "flex flex-col gap-5 py-6",
        flush: "",
        compact: "flex flex-col gap-4 py-4",
      },
    },
    defaultVariants: {
      layout: "default",
    },
  },
);

interface CardProps
  extends React.ComponentProps<"div">, VariantProps<typeof cardVariants> {}

function Card({ className, layout, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ layout }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base leading-snug font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

const cardFooterVariants = cva("px-6 [.border-t]:pt-6", {
  variants: {
    direction: {
      row: "flex items-center",
      column: "flex flex-col gap-2",
    },
  },
  defaultVariants: { direction: "row" },
});

interface CardFooterProps
  extends
    React.ComponentProps<"div">,
    VariantProps<typeof cardFooterVariants> {}

function CardFooter({ className, direction, ...props }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(cardFooterVariants({ direction }), className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
