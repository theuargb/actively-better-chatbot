"use client";

import {
  DynamicIcon,
  dynamicIconImports,
  type IconName,
} from "lucide-react/dynamic";
import { Sparkles } from "lucide-react";
import type { PromptAdIcon as PromptAdIconValue } from "app-types/prompt-ad";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { cn } from "lib/utils";

export const isLucideIconName = (value: string): value is IconName =>
  Object.prototype.hasOwnProperty.call(dynamicIconImports, value);

/**
 * Renders the three icon flavours an admin can pick for a prompt ad: a lucide
 * icon by name, or an image url (emoji picker output or a hand-typed url).
 */
export function PromptAdIcon({
  icon,
  className,
}: {
  icon?: PromptAdIconValue;
  className?: string;
}) {
  if (icon?.type === "lucide") {
    return isLucideIconName(icon.value) ? (
      <DynamicIcon
        name={icon.value}
        className={cn("size-4", className)}
        fallback={() => <Sparkles className={cn("size-4", className)} />}
      />
    ) : (
      <Sparkles className={cn("size-4", className)} />
    );
  }

  if (icon?.value) {
    return (
      <Avatar className={cn("size-4 rounded-sm", className)}>
        <AvatarImage src={icon.value} alt="" />
        <AvatarFallback className="bg-transparent">
          <Sparkles className="size-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return <Sparkles className={cn("size-4", className)} />;
}
