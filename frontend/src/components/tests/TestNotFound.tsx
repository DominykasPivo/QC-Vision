import { Link } from "react-router-dom";

export function TestNotFound() {
  return (
    <div className="mx-auto w-full max-w-[420px] px-4 py-6">
      <Link
        to="/tests"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] no-underline"
      >
        <span className="material-symbols-outlined text-base">
          chevron_left
        </span>
        Back to Tests
      </Link>
      <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">
        Test Not Found
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">
        The requested test could not be found.
      </p>
    </div>
  );
}
