"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { iconNames } from "lucide-react/dynamic";
import { useTranslations } from "next-intl";

import { Input } from "ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { PromptAdIcon } from "ui/prompt-ad-icon";
import { cn } from "lib/utils";
import type { PromptAdIcon as PromptAdIconValue } from "app-types/prompt-ad";

/** Enough hits to browse without rendering 1500 buttons on an empty query. */
const MAX_ICON_RESULTS = 60;

export function PromptAdIconPicker({
  icon,
  onChange,
}: {
  icon: PromptAdIconValue;
  onChange: (icon: PromptAdIconValue) => void;
}) {
  const t = useTranslations("Admin.PromptAds");
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const results = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const matches = query
      ? iconNames.filter((name) => name.includes(query))
      : iconNames;
    return matches.slice(0, MAX_ICON_RESULTS);
  }, [deferredSearch]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg border bg-muted/40">
          <PromptAdIcon icon={icon} className="size-6" />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("fieldIconDescription")}
        </p>
      </div>

      <Tabs defaultValue={icon.type === "lucide" ? "lucide" : icon.type}>
        <TabsList>
          <TabsTrigger value="lucide">{t("iconTabLucide")}</TabsTrigger>
          <TabsTrigger value="emoji">{t("iconTabEmoji")}</TabsTrigger>
          <TabsTrigger value="url">{t("iconTabUrl")}</TabsTrigger>
        </TabsList>

        <TabsContent value="lucide" className="space-y-2">
          <Input
            value={search}
            placeholder={t("iconSearchPlaceholder")}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="prompt-ad-icon-search"
          />
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto rounded-lg border p-2 sm:grid-cols-12">
            {results.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                onClick={() => onChange({ type: "lucide", value: name })}
                className={cn(
                  "flex items-center justify-center rounded-md p-2 hover:bg-secondary",
                  icon.type === "lucide" &&
                    icon.value === name &&
                    "bg-secondary ring-1 ring-ring",
                )}
              >
                <PromptAdIcon icon={{ type: "lucide", value: name }} />
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="emoji">
          <EmojiPicker
            lazyLoadEmojis
            open
            width="100%"
            theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(emoji) =>
              onChange({ type: "emoji", value: emoji.imageUrl })
            }
          />
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <Input
            value={icon.type === "url" ? icon.value : ""}
            placeholder="https://example.com/icon.png"
            onChange={(event) =>
              onChange({ type: "url", value: event.target.value.trim() })
            }
            data-testid="prompt-ad-icon-url"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
