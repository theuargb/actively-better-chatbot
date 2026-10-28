"use client";

import { cn } from "lib/utils";
import type { ComponentProps } from "react";
import { Button } from "ui/button";

/** The pricing page's primary call to action: gradient fill, light sweep on hover. */
export function GlowButton({
  className,
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "group/glow relative overflow-hidden border-0 text-white shadow-lg shadow-fuchsia-500/30",
        "bg-[linear-gradient(110deg,#7c3aed,#db2777,#f59e0b)]",
        "hover:shadow-xl hover:shadow-fuchsia-500/40 hover:brightness-110",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-full -skew-x-12 bg-white/35 blur-md motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover/glow:translate-x-[350%]"
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </Button>
  );
}
