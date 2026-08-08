"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";

import { appStore } from "@/app/store";
import { PromptAdIcon } from "ui/prompt-ad-icon";
import { selectPromptAds } from "lib/prompt-ad/select";
import type { PromptAdSuggestion } from "app-types/prompt-ad";

/**
 * The starter examples under the prompt input of an empty chat. `send` ads fire
 * the prompt straight at the model - the same call the prompt input makes -
 * while `prefill` ads only drop the text into the input, where the existing
 * focus effect in `chat-bot.tsx` picks it up.
 *
 * The server ships the whole active pool and the pick happens here: the model
 * can change client-side at any time, and a model-scoped ad must not advertise
 * a capability the current model lacks. Picking after mount also keeps the
 * randomness out of hydration.
 */
export function PromptAdSuggestions({
  ads,
  count,
  isLoading,
  setInput,
  sendMessage,
}: {
  ads: PromptAdSuggestion[];
  count: number;
  isLoading: boolean;
  setInput: (input: string) => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
}) {
  const chatModel = appStore((state) => state.chatModel);
  const [selected, setSelected] = useState<PromptAdSuggestion[]>([]);

  const modelKey = chatModel
    ? `${chatModel.provider}:${chatModel.model}`
    : "unknown";

  useEffect(() => {
    setSelected(selectPromptAds(ads, { model: chatModel, count }));
    // A new model means a new pick; the pool itself is stable per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads, count, modelKey]);

  if (selected.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto w-full px-6 mt-6 flex flex-col items-start gap-1">
      {selected.map((ad, index) => (
        <motion.button
          key={ad.id}
          type="button"
          disabled={isLoading}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.08 }}
          onClick={() => {
            if (isLoading) return;
            if (ad.mode === "send") {
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: ad.prompt }],
              });
            } else {
              setInput(ad.prompt);
            }
          }}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
          data-testid={`prompt-ad-suggestion-${ad.id}`}
        >
          <PromptAdIcon icon={ad.icon} className="size-4 shrink-0" />
          <span className="text-sm truncate">{ad.caption}</span>
        </motion.button>
      ))}
    </div>
  );
}
