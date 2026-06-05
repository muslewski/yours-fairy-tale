"use client";

/**
 * Last-resort boundary for errors thrown in the ROOT layout itself. It replaces
 * the entire document, so it must render its own <html>/<body> and cannot rely
 * on globals.css or the brand fonts — styles are inlined with the brand palette.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff9ee",
          color: "#1a1033",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            border: "3px solid #1a1033",
            background: "#fff",
            borderRadius: 28,
            padding: 32,
            boxShadow: "6px 6px 0 #1a1033",
          }}
        >
          <h1 style={{ fontSize: 30, margin: 0, fontWeight: 800 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: 16, color: "rgba(26,16,51,0.75)", lineHeight: 1.5 }}>
            We hit a snag. Please reload the page, or try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              border: "3px solid #1a1033",
              background: "#f042d2",
              color: "#fff",
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: 28, fontSize: 12, color: "rgba(26,16,51,0.4)" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
