import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatEnumLabel, type Test } from "@/lib/db-constants";
import { STATUS_COLORS } from "@/lib/constants/testDetailsConstants";
import { spacing } from "@/lib/ui/spacing";
import { MaterialIcon } from "./MaterialIcon";
import { formatFieldValue } from "@/lib/utils/tests/formatTestDates";

interface TestDetailHeaderProps {
  test: Test;
}

export function TestDetailHeader({ test }: TestDetailHeaderProps) {
  const jiraIdLabel = formatFieldValue(test.jiraId);
  const productNameLabel = formatFieldValue(test.productName);
  const badgeClass =
    STATUS_COLORS[test.status] ?? "bg-slate-100 text-slate-700";

  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className={cn(spacing.pageFrame, "flex items-center py-4")}>
          <Link
            to="/tests"
            className="group inline-flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-semibold text-[#2563eb] no-underline transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            <MaterialIcon
              name="arrow_back"
              className="shrink-0 text-[22px] leading-none"
            />
            <span className="leading-none">Back to Tests</span>
          </Link>
        </div>
      </div>

      <div className={cn(spacing.pageFrame, "pt-6 md:pt-10")}>
        <div className="mb-10 md:pl-8">
          <h1 className="text-5xl font-black text-slate-900">
            Test #{test.id}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-lg text-slate-500">
            <span className="flex items-center gap-1">
              <MaterialIcon name="qr_code" className="text-sm" />
              {jiraIdLabel}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MaterialIcon name="inventory_2" className="text-sm" />
              {productNameLabel}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MaterialIcon name="login" className="text-sm" />
              {formatEnumLabel(test.testType)}
            </span>
            <Badge
              className={cn(
                "ml-2 rounded-full border-0 px-3 py-1 text-sm font-bold uppercase tracking-wider",
                badgeClass,
              )}
            >
              {formatEnumLabel(test.status)}
            </Badge>
          </div>
        </div>
      </div>
    </>
  );
}
