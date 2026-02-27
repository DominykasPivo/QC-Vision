import type { TestStatus, TestType, ReviewStatus } from "./db-constants";

export interface Test {
  id: string;
  jiraId: string;
  productName: string;
  testType: TestType;
  requester: string;
  assignedTo?: string;
  description?: string | null;
  deadline: string;
  deadlineAt?: string | null;
  status: TestStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  review_status?: ReviewStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
}

export interface Photo {
  id: string;
  testId: string;
  color: string; // placeholder color for demo
  label: string;
  imageUrl?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action?: string;
  entityType?: string;
  entityId?: number;
  username?: string;
  meta?: Record<string, unknown>;
  event: string;
}
