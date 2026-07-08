import { Component } from "react";

/**
 * Catches unhandled React errors and shows a fallback UI
 * instead of a white screen. Logs the error for debugging.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
          fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
          background: "var(--bg0)", color: "var(--text)", padding: 24,
        }}>
          <div style={{ fontSize: 48, opacity: .3 }}>!</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 320 }}>
            The app encountered an error. Please try refreshing the page.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: "10px 24px", border: "none",
              borderRadius: 14, background: "var(--accent)", color: "#fff",
              cursor: "pointer", fontWeight: 800, fontSize: 14,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
