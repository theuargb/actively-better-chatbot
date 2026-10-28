"use client";

import { cn } from "lib/utils";
import type { ComponentProps } from "react";
import { Button } from "ui/button";

/** The pricing page's primary call to action: animated gradient with a light sweep. */
export function GlowButton({
  className,
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "relative overflow-hidden border-0 text-white shadow-lg shadow-fuchsia-500/30",
        "bg-[linear-gradient(110deg,#7c3aed,#db2777,#f59e0b,#7c3aed)] bg-[length:250%_100%]",
        "motion-safe:animate-[pricing-gradient-pan_6s_ease-in-out_infinite]",
        "hover:shadow-xl hover:shadow-fuchsia-500/40 hover:brightness-110",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/35 blur-md motion-safe:animate-[pricing-shimmer_3.2s_ease-in-out_infinite]"
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </Button>
  );
}
