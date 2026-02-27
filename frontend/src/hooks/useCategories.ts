import { useEffect, useState } from "react";

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); // ✅ start true
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/v1/defects/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;

        const list = Array.isArray(data)
          ? data.filter((x): x is string => typeof x === "string")
          : [];

        setCategories(list);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to fetch categories");
        setCategories([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
