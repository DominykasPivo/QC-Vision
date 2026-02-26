import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG } from "@/lib/constants/testsListConstants";
import { formatEnumLabel } from "@/lib/db-constants";
import type { Test } from "@/lib/db-constants";

interface TestCardListProps {
  test: Test;
}

export function TestCardList({ test }: TestCardListProps) {
  const styles = STATUS_CONFIG[test.status];
  const StatusIcon = styles.icon;

  const jiraIdDisplay = test.jiraId?.trim() ? test.jiraId : `#${test.id}`;
  const productLabel = test.productName?.trim()
    ? test.productName
    : formatEnumLabel(test.testType);
  const requesterLabel = test.requester?.trim() ? test.requester : null;
  const deadlineLabel = test.deadline?.trim() ? test.deadline : null;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${styles.accent}`} />
      <div className="flex flex-1 flex-col px-5 py-5 pl-9">
        <div className="flex-1 space-y-4">
          <div className="relative min-h-14 pr-36">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Jira ID
              </p>
              <p className="text-4xl font-bold leading-none text-slate-900">
                {jiraIdDisplay}
              </p>
              <p className="text-xs font-medium text-slate-500">
                Test ID: {test.id}
              </p>
            </div>

            <span
              className={`absolute right-0 top-1 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold leading-none whitespace-nowrap ${styles.badge}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {formatEnumLabel(test.status)}
            </span>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-700">
            <p className="text-[1.65rem] font-semibold leading-tight text-slate-900">
              {productLabel}
            </p>
            {requesterLabel && (
              <p className="text-sm">Requester: {requesterLabel}</p>
            )}
            {deadlineLabel && (
              <p className="text-sm">Deadline: {deadlineLabel}</p>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button
            asChild
            className="h-11 w-full rounded-full text-base font-semibold"
          >
            <Link to={`/tests/${test.id}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
