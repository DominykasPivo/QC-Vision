import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEnumLabel, type TestStatus } from "@/lib/db-constants";
import { STATUS_LABELS, STATUS_TEXT_COLORS } from "@/lib/constants";

interface TestCardProps {
  test: {
    id: string | number;
    jiraId: string | null;
    productName: string | null;
    testType: string;
    requester: string | null;
    status: TestStatus;
  };
}

export function TestCard({ test }: TestCardProps) {
  const rawPrimaryId = String(test.jiraId || test.id).trim();
  const primaryId = rawPrimaryId.startsWith("#")
    ? rawPrimaryId
    : `#${rawPrimaryId}`;

  const productLabel = test.productName?.trim()
    ? test.productName
    : formatEnumLabel(test.testType);

  const requesterLabel = test.requester?.trim()
    ? test.requester
    : "Unknown requester";

  return (
    <article className="flex flex-col justify-between rounded-[18px] border border-[#D5DFEC] bg-white p-5 md:p-[22px]">
      <div className="flex flex-col gap-4">
        <p className="text-3xl font-bold leading-none text-[#0F172A] md:text-3xl xl:text-[32px]">
          {primaryId}
        </p>
        <p className="text-xl font-semibold leading-tight text-[#1E293B] md:text-xl xl:text-[22px]">
          {productLabel}
        </p>
        <p
          className={cn(
            "text-base font-semibold md:text-base xl:text-[16px]",
            STATUS_TEXT_COLORS[test.status],
          )}
        >
          {STATUS_LABELS[test.status]}
        </p>
        <p className="text-sm font-medium text-[#64748B] md:text-sm xl:text-[15px]">
          Requester: {requesterLabel}
        </p>
      </div>

      <Button
        asChild
        className="mt-6 h-[48px] w-full rounded-[12px] bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8] md:text-[15px]"
      >
        <Link to={`/tests/${test.id}`}>View Details</Link>
      </Button>
    </article>
  );
}
