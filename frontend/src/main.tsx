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

  headers.set("X-User", username || "system");
  headers.set("X-Role", role);

  return nativeFetch(input, { ...init, headers });
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
