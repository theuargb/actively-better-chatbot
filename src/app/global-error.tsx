"use client";

import { captureClientException } from "@/lib/analytics/posthog-client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application shell failed", error);
    captureClientException(error, {
      boundary: "global",
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            fontFamily: "system-ui, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 448 }}>
            <h1>Something went wrong</h1>
            <p>The application could not start. Please try loading it again.</p>
            <button type="button" onClick={reset}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
