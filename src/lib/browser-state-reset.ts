"use client";

import { appStore } from "@/app/store";
import { IS_BROWSER } from "./const";
import { PRE_FIX } from "./browser-stroage";

/**
 * Wipes everything this app persists in the browser: the zustand store (chat
 * model, tool choice, allowed MCP servers/toolkits, tool presets, voice and
 * temporary-chat settings) plus every `getStorageManager` key.
 *
 * Triggered by a banner flagged `resetState`, so a release that invalidates
 * saved preferences can clear them out as users acknowledge it.
 *
 * Deliberately left alone: the next-themes key (`app-theme-v2`) and the sidebar
 * cookie. Flipping someone from dark to light is jarring and unrelated to any
 * state a release would actually break.
 */
export function resetClientState(): void {
  if (!IS_BROWSER) return;

  appStore.persist.clearStorage();

  Object.keys(localStorage)
    .filter((key) => key.startsWith(PRE_FIX))
    .forEach((key) => localStorage.removeItem(key));

  Object.keys(sessionStorage)
    .filter((key) => key.startsWith(PRE_FIX))
    .forEach((key) => sessionStorage.removeItem(key));
}
