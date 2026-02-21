import { useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { isLoggedIn, loginUser, setStoredRole } from "@/lib/auth";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";

// If your project uses request/ApiError elsewhere, use it.
// Otherwise we use fetch here to match CreateTest's pattern.
type MeResponse = {
  username: string;
  role: string; // e.g. "user" | "worker" | "reviewer" | "admin"
  // optional: permissions?: string[]
};

export function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => username.trim(), [username]);

  // ✅ Allow logins (remove the "exactly 5 chars" blocker)
  const MIN_LEN = 2;
  const MAX_LEN = 32;
  const isValid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;

  if (isLoggedIn()) {
    return <Navigate to="/tests" replace />;
  }

  const controlClass =
    "rounded-2xl border-2 border-slate-300 bg-white font-medium text-slate-900 shadow-none transition-all focus-visible:border-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#2563eb]/20";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);

    if (!isValid || isLoading) return;

    setIsLoading(true);
    try {
      // Match CreateTest style: raw fetch + parse text
      const res = await fetch("/api/v1/users/me", {
        method: "GET",
        headers: {
          "X-User": trimmed,
        },
      });

      const text = await res.text();
      const parsed = text
        ? (JSON.parse(text) as
            | MeResponse
            | { detail?: string; message?: string })
        : null;

      if (!res.ok) {
        const message =
          (parsed && ("detail" in parsed ? parsed.detail : undefined)) ||
          (parsed && ("message" in parsed ? parsed.message : undefined)) ||
          text ||
          `Login failed (${res.status})`;
        throw new Error(message);
      }

      const me = parsed as MeResponse;

      // Store user + role for permissions (review access)
      loginUser(me.username);
      setStoredRole(me.role);

      navigate("/tests", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const clientError =
    touched && !isValid
      ? `Username must be ${MIN_LEN}–${MAX_LEN} characters.`
      : null;

  return (
    <div
      className={cn(
        spacing.pageContainer,
        "min-h-[calc(100dvh-var(--header-height)-var(--nav-height))] bg-slate-50 pb-24 md:pb-8",
      )}
    >
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:p-6">
          <div className="mb-6 md:mb-8">
            <h2 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
              QC Vision
            </h2>
            <p className="mt-1 text-[18px] font-medium text-slate-500">
              Enter your username to continue
            </p>
          </div>

          {(error || clientError) && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {clientError ?? error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={cn(spacing.fieldStack)}
            noValidate
          >
            <div className={spacing.fieldGroup}>
              <label
                className="text-base font-semibold text-slate-900 md:text-lg"
                htmlFor="username"
              >
                Username
              </label>
              <Input
                id="username"
                name="username"
                density="spacious"
                className={controlClass}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched(true)}
                autoComplete="username"
                disabled={isLoading}
                aria-invalid={Boolean(clientError)}
              />
            </div>

            <div className={spacing.actionRow}>
              <Button
                type="submit"
                density="spacious"
                className="h-16 w-full rounded-3xl bg-[#2563eb] text-lg font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8] focus-visible:ring-4 focus-visible:ring-[#2563eb]/30 focus-visible:ring-offset-0"
                disabled={!isValid || isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>

            <p className="text-center text-sm font-medium text-slate-500">
              Your role will be applied automatically (review access included if
              allowed).
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
