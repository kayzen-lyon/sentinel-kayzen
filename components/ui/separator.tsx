import * as React from "react";
import { cn } from "@/lib/utils";

/** Séparateur shadcn/ui (décoratif par défaut). */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical"; decorative?: boolean }) {
  return (
    <div
      data-slot="separator"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px self-stretch",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
