import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEnumLabel, type Test } from "@/lib/db-constants";
import { fetchTestActivity, type AuditActivityItem } from "@/lib/api/audit";
import { MaterialIcon } from "./MaterialIcon";
import { InfoItem } from "./InfoItem";
import {
  formatDateOnly,
  formatFieldValue,
} from "@/lib/utils/tests/formatTestDates";

interface TestInformationCardProps {
  test: Test;
}

export function TestInformationCard({ test }: TestInformationCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [recentChanges, setRecentChanges] = useState<AuditActivityItem[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesError, setChangesError] = useState<string | null>(null);
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

  useEffect(() => {
    const testId = Number(test.id);
    if (!Number.isFinite(testId)) {
      setRecentChanges([]);
      return;
    }

    let isCancelled = false;
    const loadRecentChanges = async () => {
      setChangesLoading(true);
      setChangesError(null);
      try {
        const data = await fetchTestActivity(testId, {
          user_actions_only: true,
          limit: 12,
          offset: 0,
        });
        if (!isCancelled) {
          setRecentChanges(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        if (!isCancelled) {
          setChangesError(
            error instanceof Error
              ? error.message
              : "Failed to load recent changes.",
          );
        }
      } finally {
        if (!isCancelled) {
          setChangesLoading(false);
        }
      }
    };

    loadRecentChanges();

    return () => {
      isCancelled = true;
    };
  }, [test.id]);

  const formatChangeTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatChangeMessage = (item: AuditActivityItem) => {
    const meta =
      item.meta && typeof item.meta === "object"
        ? item.meta
        : ({} as Record<string, unknown>);
    const actor = item.username || "system";
    const fromValue = meta.from;
    const toValue = meta.to;
    const updatedFields = Array.isArray(meta.updated_fields)
      ? meta.updated_fields
      : [];
    const safe = (value: unknown) =>
      value == null || value === "" ? "none" : String(value);

    switch (item.action) {
      case "STATUS_CHANGE":
        return `${actor} changed status from ${safe(fromValue)} to ${safe(toValue)}`;
      case "ASSIGN":
        return `${actor} changed assignee from ${safe(fromValue)} to ${safe(toValue)}`;
      case "UNASSIGN":
        return `${actor} unassigned ${safe(fromValue)}`;
      case "TEST_TYPE_CHANGE":
        return `${actor} changed test type from ${safe(fromValue)} to ${safe(toValue)}`;
      case "UPDATE":
        return updatedFields.length > 0
          ? `${actor} updated fields: ${updatedFields.map(String).join(", ")}`
          : `${actor} updated this test`;
      case "UPLOAD":
        return `${actor} uploaded photo #${item.entity_id}`;
      case "ADD_DEFECT":
        return `${actor} added defect #${item.entity_id}`;
      case "REMOVE_DEFECT":
        return `${actor} removed defect #${item.entity_id}`;
      case "CREATE":
        return `${actor} created this test`;
      case "DELETE":
        return `${actor} deleted this test`;
      default:
        return `${actor} performed ${item.action.toLowerCase().replace(/_/g, " ")}`;
    }
  };

  const visibleRecentChanges = recentChanges.filter(
    (change) => change.action !== "UPDATE",
  );

  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-8 py-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <MaterialIcon name="info" className="text-[#2563eb]" />
            Test Information
          </CardTitle>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-slate-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500" />
          )}
        </button>
      </CardHeader>
      {isOpen && <CardContent className="space-y-6 px-8 py-8">
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
          <InfoItem label="Test ID" value={String(test.id)} />
          <InfoItem label="Jira ID" value={jiraIdLabel} />
          <InfoItem label="Product Name" value={productNameLabel} />
          <InfoItem label="Test Type" value={formatEnumLabel(test.testType)} />
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
              hasDescription ? "italic text-slate-700" : "text-slate-400",
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
              <p className="italic text-slate-700">"{test.review_comment}"</p>
            </div>
          )}
        </div>

        <Separator className="bg-slate-100" />

        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Recent Changes
          </p>

          {changesLoading ? (
            <p className="text-sm text-slate-500">Loading changes...</p>
          ) : changesError ? (
            <p className="text-sm text-red-600">{changesError}</p>
          ) : visibleRecentChanges.length === 0 ? (
            <p className="text-sm text-slate-500">No change history yet.</p>
          ) : (
            <div className="space-y-2">
              {visibleRecentChanges.map((change) => (
                <div
                  key={change.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {formatChangeMessage(change)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatChangeTimestamp(change.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>}
    </Card>
  );
}
