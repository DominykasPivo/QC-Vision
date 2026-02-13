// Mock data for QC Vision MVP

import type { TestStatus, TestType } from '../lib/db-constants';

export interface Test {
  id: string;
  externalOrderId: string;
  productId?: number | string;
  productType: string;
  testType: TestType;
  requester: string;
  assignedTo?: string;
  description?: string | null;
  deadline: string;
  deadlineAt?: string | null;
  status: TestStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  event: string;
  timestamp: string;
}

export const tests: Test[] = [];

export const photos: Photo[] = [];

export const auditEvents: AuditEvent[] = [];
