import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatEnumLabel, type Test } from "@/lib/db-constants";
import { MaterialIcon } from "./MaterialIcon";
import { InfoItem } from "./InfoItem";
import { formatDateOnly, formatFieldValue } from "@/lib/utils/tests/formatTestDates";

interface TestInformationCardProps {
  test: Test;
}

export function TestInformationCard({ test }: TestInformationCardProps) {
  const jiraIdLabel = formatFieldValue(test.jiraId);
  const productNameLabel = formatFieldValue(test.productName);
  const requesterLabel = formatFieldValue(test.requester);
  const assignedToLabel = formatFieldValue(test.assignedTo);
  const deadlineSource =
    test.deadlineAt ??
    (test.deadline && test.deadline !== "None" ? test.deadline : null);
  const deadlineLabel = deadlineSource ? formatDateOnly(deadlineSource) : "—";
  const createdLabel = formatDateOnly(test.createdAt ?? null);
  const updatedLabel = formatDateOnly(test.updatedAt ?? null);
  const hasDescription = Boolean(test.description?.trim());

  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-8 py-6">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <MaterialIcon name="info" className="text-[#2563eb]" />
          Test Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-8 py-8">
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
          <InfoItem label="Test ID" value={String(test.id)} />
          <InfoItem label="Jira ID" value={jiraIdLabel} />
          <InfoItem label="Product Name" value={productNameLabel} />
          <InfoItem
            label="Test Type"
            value={formatEnumLabel(test.testType)}
          />
          <InfoItem label="Requester" value={requesterLabel} />
          <InfoItem
            label="Assigned To"
            value={assignedToLabel}
            valueClassName={
              assignedToLabel !== "—"
                ? "text-[#2563eb] font-semibold"
                : "text-slate-300"
            }
          />
          <InfoItem
            label="Deadline"
            value={deadlineLabel}
            valueClassName={
              deadlineLabel !== "—"
                ? "text-red-600 font-semibold"
                : "text-slate-300"
            }
          />
        </div>

        <Separator className="bg-slate-100" />

        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            Description
          </p>
          <p
            className={cn(
              "text-xl",
              hasDescription
                ? "italic text-slate-700"
                : "text-slate-400",
            )}
          >
            {hasDescription
              ? `"${test.description}"`
              : "No description provided"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-6 border-t border-slate-100 pt-6 md:grid-cols-2">
          <InfoItem
            label="Created"
            value={createdLabel}
            valueClassName="text-lg"
          />
          <InfoItem
            label="Last Updated"
            value={updatedLabel}
            valueClassName="text-lg"
          />
        </div>

        <Separator className="bg-slate-100" />

        {/* Review Status Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Review Status
            </p>
            <Badge
              className={cn(
                "px-3 py-1 text-sm font-bold",
                test.review_status === "approved"
                  ? "bg-green-100 text-green-800"
                  : test.review_status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800",
              )}
            >
              {test.review_status
                ? formatEnumLabel(test.review_status)
                : "Pending"}
            </Badge>
          </div>

          {test.reviewed_by && (
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
              <InfoItem label="Reviewed By" value={test.reviewed_by} />
              {test.reviewed_at && (
                <InfoItem
                  label="Reviewed At"
                  value={new Date(test.reviewed_at).toLocaleString()}
                />
              )}
            </div>
          )}

          {test.review_comment && (
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                Review Comment
              </p>
              <p className="italic text-slate-700">
                "{test.review_comment}"
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
