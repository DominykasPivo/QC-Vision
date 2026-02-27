import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VerificationStatusBarProps {
  isApproved: boolean;
  isRejected: boolean;
  isSaving: boolean;
  onVerify: (status: string) => void;
}

export function VerificationStatusBar({
  isApproved,
  isRejected,
  isSaving,
  onVerify,
}: VerificationStatusBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Verification:</span>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
            isApproved && "bg-emerald-100 text-emerald-800",
            isRejected && "bg-red-100 text-red-800",
            !isApproved && !isRejected && "bg-slate-100 text-slate-700",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isApproved && "bg-emerald-500",
              isRejected && "bg-red-500",
              !isApproved && !isRejected && "bg-slate-400",
            )}
          />
          {isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          density="compact"
          variant={isApproved ? "default" : "outline"}
          className={cn(!isApproved && "border-slate-300 text-slate-700")}
          onClick={() => onVerify(isApproved ? "pending" : "approved")}
          disabled={isSaving}
        >
          {isApproved ? "✓ Approved" : "Approve"}
        </Button>

        <Button
          type="button"
          density="compact"
          variant={isRejected ? "default" : "outline"}
          className={cn(
            isRejected
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border-slate-300 text-slate-700",
          )}
          onClick={() => onVerify(isRejected ? "pending" : "rejected")}
          disabled={isSaving}
        >
          {isRejected ? "✗ Rejected" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
