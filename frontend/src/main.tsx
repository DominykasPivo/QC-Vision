import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { getStoredRole, getStoredUsername } from "./lib/auth";

const nativeFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const isApiRequest =
    requestUrl.startsWith("/api/") || requestUrl.includes("/api/v1/");

  if (!isApiRequest) {
    return nativeFetch(input, init);
  }

  const headers = new Headers(init?.headers ?? {});
  const username = getStoredUsername().trim();
  const role = getStoredRole().trim() || "user";

  // Only set headers if not already present (don't override explicit values like during login)
  if (!headers.has("X-User")) {
    headers.set("X-User", username || "system");
  }
  if (!headers.has("X-Role")) {
    headers.set("X-Role", role);
  }

  return nativeFetch(input, { ...init, headers });
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
