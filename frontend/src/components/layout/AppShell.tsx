import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { photos as initialPhotos, tests as initialTests } from '../../mock/data';
import type { AuditEvent, Photo, Test } from '../../mock/data';
import { TEST_STATUSES, TEST_TYPES, type TestStatus, type TestType } from '@/lib/db-constants';
import { isReviewer, logoutUser } from '@/lib/auth';
import { fetchAuditLogs } from '@/api/audit';

export type AppDataContext = {
  tests: Test[];
  testsLoaded: boolean;
  photos: Photo[];
  auditEvents: AuditEvent[];
  addTest: (test: Test) => void;
  addPhoto: (photo: Photo) => void;
  addAuditEvent: (event: AuditEvent) => void;
  removeTest: (testId: string) => void;
  removePhotosForTest: (testId: string) => void;
  removePhoto: (photoId: string) => void;
  updateTest: (testId: string, updates: Partial<Test>) => void;
  refreshTests: () => Promise<void>;
};

const STORAGE_KEYS = {
  photos: 'qc-vision:photos',
  audit: 'qc-vision:audit-events',
  deletedTests: 'qc-vision:deleted-tests',
};

type ApiTest = {
  id: number | string;
  productId?: number;
  product_id?: number;
  testType?: string;
  test_type?: string;
  requester?: string;
  assignedTo?: string | null;
  assigned_to?: string | null;
  description?: string | null;
  status?: string | null;
  deadlineAt?: string | null;
  deadline_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  externalOrderId?: string;
  productType?: string;
};

type ApiAuditLog = {
  id: string | number;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id?: string | number | null;
  username?: string | null;
};

const normalizeStatus = (value: unknown): TestStatus => {
  if (typeof value !== 'string') return 'pending';
  return TEST_STATUSES.includes(value as TestStatus) ? (value as TestStatus) : 'pending';
};

const normalizeTestType = (value: unknown): TestType => {
  if (typeof value !== 'string') return 'other';
  return TEST_TYPES.includes(value as TestType) ? (value as TestType) : 'other';
};

const formatDeadline = (value?: string | null): string => {
  if (!value) return 'None';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const toFrontendTest = (raw: ApiTest): Test => {
  const productId = raw.productId ?? raw.product_id;
  const testType = normalizeTestType(raw.testType ?? raw.test_type);
  const status = normalizeStatus(raw.status);
  const deadlineAt = raw.deadlineAt ?? raw.deadline_at ?? null;
  const assignedTo = raw.assignedTo ?? raw.assigned_to ?? undefined;
  const createdAt = raw.createdAt ?? raw.created_at ?? null;
  const updatedAt = raw.updatedAt ?? raw.updated_at ?? null;

  return {
    id: String(raw.id),
    externalOrderId: raw.externalOrderId ?? (productId !== undefined ? String(productId) : String(raw.id)),
    productId,
    productType: raw.productType ?? (productId !== undefined ? `Product ${productId}` : 'Unknown product'),
    testType,
    requester: raw.requester ?? '',
    assignedTo: assignedTo || undefined,
    description: raw.description ?? null,
    deadline: formatDeadline(deadlineAt),
    deadlineAt,
    status,
    createdAt,
    updatedAt,
  };
};

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const canReview = isReviewer();

  const [tests, setTests] = useState<Test[]>(initialTests);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [testsLoaded, setTestsLoaded] = useState(false);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [deletedTestIds, setDeletedTestIds] = useState<string[]>([]);

  useEffect(() => {
    const storedPhotos = localStorage.getItem(STORAGE_KEYS.photos);
    const storedAudit = localStorage.getItem(STORAGE_KEYS.audit);
    const storedDeletedTests = localStorage.getItem(STORAGE_KEYS.deletedTests);

    if (storedPhotos) {
      try {
        setPhotos(JSON.parse(storedPhotos));
      } catch {
        // ignore
      }
    }

    if (storedAudit) {
      try {
        setAuditEvents(JSON.parse(storedAudit));
      } catch {
        // ignore
      }
    }

    if (storedDeletedTests) {
      try {
        setDeletedTestIds(JSON.parse(storedDeletedTests));
      } catch {
        // ignore
      }
    }

    setStorageHydrated(true);
  }, []);

  useEffect(() => {
    if (!storageHydrated) return;

    const safePhotos = photos.map(({ id, testId, color, label }) => ({
      id,
      testId,
      color,
      label,
    }));

    localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(safePhotos));
  }, [photos, storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    localStorage.setItem(STORAGE_KEYS.deletedTests, JSON.stringify(deletedTestIds));
  }, [deletedTestIds, storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(auditEvents));
  }, [auditEvents, storageHydrated]);

  const refreshTests = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/tests/?limit=100');
      if (!response.ok) throw new Error(`Failed to load tests (${response.status})`);

      const payload = await response.json();

      const rawTests = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.tests)
            ? payload.tests
            : [];

      const mapped = rawTests.map((t: ApiTest) => toFrontendTest(t));

      setTests(mapped);
      setTestsLoaded(true);

      if (deletedTestIds.length > 0) setDeletedTestIds([]);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Tests] Failed to load tests:', error);
      }
    }
  }, [deletedTestIds]);

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const data = await fetchAuditLogs();

        const mapped: AuditEvent[] = (data?.items ?? []).map((log: ApiAuditLog) => ({
          id: String(log.id),
          timestamp: log.created_at,
          event: `${log.action} ${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''} by ${
            log.username ?? 'system'
          }`,
        }));

        setAuditEvents(mapped);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[Audit] Failed to load audit logs:', error);
        }
      }
    };

    loadAuditLogs();
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!storageHydrated) {
      return () => {
        isActive = false;
      };
    }

    const load = async () => {
      await refreshTests();
      if (!isActive) return;
    };

    load();

    return () => {
      isActive = false;
    };
  }, [refreshTests, storageHydrated]);

  const addTest = (test: Test) => setTests((prev) => [test, ...prev]);
  const addPhoto = (photo: Photo) => setPhotos((prev) => [photo, ...prev]);
  const addAuditEvent = (event: AuditEvent) => setAuditEvents((prev) => [event, ...prev]);

  const removeTest = (testId: string) => {
    setTests((prev) => prev.filter((t) => t.id !== testId));
    setDeletedTestIds((prev) => (prev.includes(testId) ? prev : [testId, ...prev]));
  };

  const removePhotosForTest = (testId: string) => {
    setPhotos((prev) => prev.filter((p) => p.testId !== testId));
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const updateTest = (testId: string, updates: Partial<Test>) => {
    setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, ...updates } : t)));
  };

  const contextValue = useMemo(
    () => ({
      tests,
      testsLoaded,
      photos,
      auditEvents,
      addTest,
      addPhoto,
      addAuditEvent,
      removeTest,
      removePhotosForTest,
      removePhoto,
      updateTest,
      refreshTests,
    }),
    [tests, testsLoaded, photos, auditEvents, refreshTests],
  );

  const navItems = useMemo(() => {
    const items = [
      {
        to: '/tests',
        label: 'Tests',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
            />
          </svg>
        ),
      },
      {
        to: '/create',
        label: 'Create',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
      {
        to: '/gallery',
        label: 'Gallery',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        ),
      },
      {
        to: '/audit',
        label: 'Audit',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
      },
    ] as Array<{ to: string; label: string; icon: JSX.Element }>;

    if (canReview) {
      items.push({
        to: '/review',
        label: 'Review',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 0 0 1 18 0Z" />
          </svg>
        ),
      });
    }

    return items;
  }, [canReview]);

  const isTestDetailsRoute = /^\/tests\/[^/]+\/?$/.test(location.pathname);

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="sidebar-header">
          <h2>QC Vision</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-wrapper">
        <header className="app-header">
          <h1>QC Vision</h1>

          <button
            className="logout-button"
            type="button"
            onClick={() => {
              logoutUser();
              navigate('/login', { replace: true });
            }}
          >
            Logout
          </button>
        </header>

        <main className={`app-content ${isTestDetailsRoute ? 'app-content--test-details' : ''}`}>
          <Outlet context={contextValue} />
        </main>
      </div>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}