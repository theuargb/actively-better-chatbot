import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export function initializePostHog() {
  if (!posthogKey || posthog.__loaded) return;

  posthog.init(posthogKey, {
    api_host: posthogHost || "https://us.i.posthog.com",
    defaults: "2025-11-30",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: true,
    },
  });
}

export function captureClientException(
  error: unknown,
  properties?: Record<string, string | number | boolean | undefined>,
) {
  if (!posthogKey) return;

  try {
    initializePostHog();
    posthog.captureException(error, properties);
  } catch (reportingError) {
    // Error reporting must never cause a second application failure.
    console.warn("Unable to report client exception", reportingError);
  }
}
