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

export async function createColor(
  name: string,
  hexValue: string,
): Promise<Color> {
  const res = await fetch("/api/v1/tests/colors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, hex_value: hexValue }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.detail ?? "Failed to create color"), {
      status: res.status,
    });
  }
  const c: { id: number; name: string; hex_value: string; is_active: boolean } =
    await res.json();
  return {
    id: c.id,
    name: c.name,
    hexValue: c.hex_value,
    isActive: c.is_active,
  };
}
