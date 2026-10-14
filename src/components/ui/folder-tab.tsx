import * as React from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

interface FolderTabProps extends React.ComponentProps<"span"> {
  open?: boolean;
  asChild?: boolean;
}

/**
 * An index tab on a manila folder. Tabs say where you are: use them for
 * sections that own the folder below, and plain links for everything else.
 */
function FolderTab({
  className,
  open = false,
  asChild = false,
  ...props
}: FolderTabProps) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="folder-tab"
      data-open={open ? "" : undefined}
      className={cn(
        // One weight for every tab, so the row does not shift when another opens.
        "folder-tab h-10 shrink-0 px-5 text-sm font-semibold",
        open
          ? "folder-tab-open text-foreground"
          : "text-foreground/80 hover:text-foreground hover:[--tab-fill:color-mix(in_srgb,var(--tab),var(--background)_60%)]",
        className,
      )}
      {...props}
    />
  );
}

export { FolderTab };
