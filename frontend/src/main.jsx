import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/motion.css";
import "./styles/primitives.css";
import "./styles/screens/auth.css";
import "./styles/screens/shell.css";
import "./styles/screens/chat.css";
import "./styles/screens/profile.css";
import "./styles/screens/settings.css";
import "./styles/responsive.css";
import "./crypto-engine.ts";

// If crypto-engine.js is not loaded, warn in the console without crashing the app
if (!window.e2ee) {
  console.warn(
    "[E2EE] crypto-engine.js is not loaded. " +
    "Check WebCrypto support and crypto-engine module initialization."
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
