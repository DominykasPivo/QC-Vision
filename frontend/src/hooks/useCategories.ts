import { useState, useEffect } from "react";

export type CategoryRecord = { id: number; name: string; is_active: boolean };

/**
 * Custom hook for fetching defect categories
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/api/v1/defects/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data) => {
        setCategories(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch categories:", err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return {
    categories,
    loading,
    error,
  };
}