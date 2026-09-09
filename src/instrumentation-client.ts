import { initializePostHog } from "@/lib/analytics/posthog-client";

try {
  initializePostHog();
} catch (error) {
  // Monitoring must not prevent hydration when storage or scripts are blocked.
  console.warn("Unable to initialize client monitoring", error);
}
