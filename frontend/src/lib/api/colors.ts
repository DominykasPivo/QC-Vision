import type { Color } from "@/lib/types";

export async function fetchColors(): Promise<Color[]> {
  const res = await fetch("/api/v1/tests/colors");
  if (!res.ok) throw new Error("Failed to fetch colors");
  const data: Array<{
    id: number;
    name: string;
    hex_value: string;
    is_active: boolean;
  }> = await res.json();
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    hexValue: c.hex_value,
    isActive: c.is_active,
  }));
}
