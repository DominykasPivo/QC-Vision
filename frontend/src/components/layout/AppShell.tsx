import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { AuditEvent, Photo, Test } from "@/lib/types";
import {
  logoutUser,
  getStoredUsername,
  getStoredRole,
  setStoredRole,
} from "@/lib/auth";
import { request } from "@/lib/api/http";
import { fetchAuditLogs } from "@/lib/api/audit";
import {
  toFrontendTest,
  type ApiTest,
  type ApiAuditLog,
} from "@/lib/api/normalization";
import { processAuditLogs } from "@/lib/api/audit-formatting";
import { buildNavItems } from "./app-shell/navItems";
import { isTestDetailsRoute } from "./app-shell/routeUtils";
import {
  STORAGE_KEYS,
  readStoredJson,
  writeStoredJson,
} from "./app-shell/storage";

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

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentRole, setCurrentRole] = useState<string>("user");
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [canReview, setCanReview] = useState(false);

  const [tests, setTests] = useState<Test[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [testsLoaded, setTestsLoaded] = useState(false);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [deletedTestIds, setDeletedTestIds] = useState<string[]>([]);

  // Initialize role from localStorage
  useEffect(() => {
    const storedRole = getStoredRole();
    setCurrentRole(storedRole);
    setCanReview(storedRole === "reviewer" || storedRole === "admin");
  }, []);

  const handleRoleChange = useCallback(
    async (newRole: string) => {
      if (newRole === currentRole) return;

      setIsChangingRole(true);
      try {
        const username = getStoredUsername();
        await request<{ username: string; role: string }>(
          "/api/v1/users/me/role",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-User": username || "system",
            },
            body: JSON.stringify({ role: newRole }),
          },
        );

        // Update localStorage and state
        setStoredRole(newRole);
        setCurrentRole(newRole);
        setCanReview(newRole === "reviewer" || newRole === "admin");
      } catch (error) {
        console.error("Failed to update role:", error);
        // Reset to previous role on error
        setCurrentRole(getStoredRole());
      } finally {
        setIsChangingRole(false);
      }
    },
    [currentRole],
  );

  useEffect(() => {
    const storedPhotos = readStoredJson<Photo[]>(STORAGE_KEYS.photos);
    const storedAudit = readStoredJson<AuditEvent[]>(STORAGE_KEYS.audit);
    const storedDeletedTests = readStoredJson<string[]>(
      STORAGE_KEYS.deletedTests,
    );

    if (storedPhotos) setPhotos(storedPhotos);
    if (storedAudit) setAuditEvents(storedAudit);
    if (storedDeletedTests) setDeletedTestIds(storedDeletedTests);

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

    writeStoredJson(STORAGE_KEYS.photos, safePhotos);
  }, [photos, storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    writeStoredJson(STORAGE_KEYS.deletedTests, deletedTestIds);
  }, [deletedTestIds, storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    writeStoredJson(STORAGE_KEYS.audit, auditEvents);
  }, [auditEvents, storageHydrated]);

  const refreshTests = useCallback(async () => {
    if (!getStoredUsername()) return;

    try {
      const response = await fetch("/api/v1/tests/?limit=100");
      if (!response.ok) {
        throw new Error(`Failed to load tests (${response.status})`);
      }

      const payload = await response.json();

      const rawTests = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.tests)
            ? payload.tests
            : [];

      type ReviewPatch = {
        review_status?: Test["review_status"];
        reviewed_by?: Test["reviewed_by"];
        reviewed_at?: Test["reviewed_at"];
        review_comment?: Test["review_comment"];
      };

      const mapped = rawTests.map((t: ApiTest) => {
        const base = toFrontendTest(t) as Test;

        const raw = t as unknown as ReviewPatch;
        const existing = base as unknown as ReviewPatch;

        return {
          ...base,
          review_status: raw.review_status ?? existing.review_status,
          reviewed_by: raw.reviewed_by ?? existing.reviewed_by,
          reviewed_at: raw.reviewed_at ?? existing.reviewed_at,
          review_comment: raw.review_comment ?? existing.review_comment,
        } as Test;
      });

      setTests(mapped);
      setTestsLoaded(true);

      if (deletedTestIds.length > 0) setDeletedTestIds([]);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Tests] Failed to load tests:", error);
      }
    }
  }, [deletedTestIds]);

  useEffect(() => {
    const loadAuditLogs = async () => {
      if (!getStoredUsername()) return;

      try {
        const data = await fetchAuditLogs();

        const items: ApiAuditLog[] = Array.isArray(data?.items)
          ? data.items
          : [];

        const mapped = processAuditLogs(items);

        setAuditEvents(mapped);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[Audit] Failed to load audit logs:", error);
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

  // Poll for updated tests every 30 seconds, but only when the tab is visible.
  // This does NOT affect any in-progress form edits because form draft state
  // lives in each page component independently of the tests context array.
  useEffect(() => {
    if (!testsLoaded) return;

    const POLL_MS = 30_000;
    const id = setInterval(() => {
      if (!document.hidden) {
        refreshTests();
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [testsLoaded, refreshTests]);

  const addTest = (test: Test) => setTests((prev) => [test, ...prev]);
  const addPhoto = (photo: Photo) => setPhotos((prev) => [photo, ...prev]);
  const addAuditEvent = (event: AuditEvent) =>
    setAuditEvents((prev) => [event, ...prev]);

  const removeTest = (testId: string) => {
    setTests((prev) => prev.filter((t) => t.id !== testId));
    setDeletedTestIds((prev) =>
      prev.includes(testId) ? prev : [testId, ...prev],
    );
  };

  const removePhotosForTest = (testId: string) => {
    setPhotos((prev) => prev.filter((p) => p.testId !== testId));
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const updateTest = (testId: string, updates: Partial<Test>) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, ...updates } : t)),
    );
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

  const navItems = useMemo(() => buildNavItems(canReview), [canReview]);

  const detailsRoute = isTestDetailsRoute(location.pathname);

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="sidebar-header">
          <h2>QC Vision</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? "active" : ""}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-role-selector">
          <select
            id="role-select"
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isChangingRole}
            className="role-select"
          >
            <option value="user">User</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="app-header">
          <h1>QC Vision</h1>

          <div className="mobile-role-selector">
            <select
              id="role-select-mobile"
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={isChangingRole}
              className="role-select"
            >
              <option value="user">User</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>

          <div className="header-controls">
            <button
              className="logout-button"
              type="button"
              onClick={() => {
                logoutUser();
                navigate("/login", { replace: true });
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <main
          className={`app-content ${
            detailsRoute ? "app-content--test-details" : ""
          }`}
        >
          <Outlet context={contextValue} />
        </main>
      </div>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
