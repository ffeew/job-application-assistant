"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  /** Shared radio group name. */
  name: string;
  /** Id of the element that labels the group. */
  labelledBy: string;
  options: readonly SegmentedControlOption<T>[];
  value: T | undefined;
  onValueChange: (value: T) => void;
  className?: string;
}

/** A short either/or choice, built on native radios for keyboard support. */
function SegmentedControl<T extends string | number>({
  name,
  labelledBy,
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      data-slot="segmented-control"
      className={cn(
        "border-border bg-card inline-flex w-fit rounded-md border p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-ring relative flex h-8 cursor-pointer items-center rounded-sm px-3 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={option.value === value}
            onChange={() => onValueChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export { SegmentedControl };
