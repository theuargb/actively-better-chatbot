import {
  isPromptAdForModel,
  type PromptAdModel,
  type PromptAdSuggestion,
} from "app-types/prompt-ad";

/** Fisher-Yates on a copy - the pool is shared state and must stay untouched. */
export function shufflePromptAds(
  ads: PromptAdSuggestion[],
): PromptAdSuggestion[] {
  const result = [...ads];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Picks the examples to render for one model. The whole active pool is shipped
 * to the client so switching models re-picks without a round trip; this is the
 * function that turns that pool into the handful actually shown.
 */
export function selectPromptAds(
  ads: PromptAdSuggestion[],
  {
    model,
    count,
  }: {
    model?: PromptAdModel | null;
    count: number;
  },
): PromptAdSuggestion[] {
  if (count <= 0) return [];
  const eligible = ads.filter((ad) => isPromptAdForModel(ad, model));
  return shufflePromptAds(eligible).slice(0, count);
}
