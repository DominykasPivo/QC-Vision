import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function TestsEmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">No tests yet</h2>
      <p className="mt-2 text-sm text-slate-600">
        Create your first quality control test to get started.
      </p>
      <Button asChild className="mt-4 h-11 rounded-full px-6 font-semibold">
        <Link to="/create">Create Test</Link>
      </Button>
    </div>
  );
}
