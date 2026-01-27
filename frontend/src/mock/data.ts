// Mock data for QC Vision MVP

export interface Test {
  id: string;
  externalOrderId: string;
  productType: string;
  testType: string;
  requester: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface Photo {
  id: string;
  testId: string;
  color: string; // placeholder color for demo
  label: string;
}

export interface AuditEvent {
  id: string;
  event: string;
  timestamp: string;
}

export const tests: Test[] = [];

export const photos: Photo[] = [];

export const auditEvents: AuditEvent[] = [];
