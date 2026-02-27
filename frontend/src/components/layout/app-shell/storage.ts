export const STORAGE_KEYS = {
  photos: "qc-vision:photos",
  audit: "qc-vision:audit-events",
  deletedTests: "qc-vision:deleted-tests",
};

export function readStoredJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}
