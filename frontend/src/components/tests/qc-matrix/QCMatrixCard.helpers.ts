import { ALL_METHODS } from "@/lib/constants/printTypes";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import type {
  ParsedColumns,
  CustomColumnDef,
  CellStatus,
} from "./QCMatrixCard.types";

export function parseColumns(raw: string | null): ParsedColumns {
  try {
    if (raw) {
      const parsed = JSON.parse(raw) as {
        methods?: string[];
        merged?: string[];
        customColumns?: CustomColumnDef[];
        customMethods?: string[];
        customMerged?: string[];
      };
      return {
        methods: new Set(parsed.methods ?? ALL_METHODS.map((m) => m.key)),
        merged: new Set(parsed.merged ?? []),
        customColumns: parsed.customColumns ?? [],
        customMethods: new Set(parsed.customMethods ?? []),
        customMerged: new Set(parsed.customMerged ?? []),
      };
    }
  } catch {
    // Ignore parsing errors and return defaults
  }
  return {
    methods: new Set(ALL_METHODS.map((m) => m.key)),
    merged: new Set<string>(),
    customColumns: [],
    customMethods: new Set<string>(),
    customMerged: new Set<string>(),
  };
}

export function getCellStatus(cellPhotos: ApiPhoto[]): CellStatus {
  if (cellPhotos.length === 0) return "approved";
  if (cellPhotos.some((p) => p.verification_status === "rejected"))
    return "rejected";
  if (
    cellPhotos.some(
      (p) => !p.verification_status || p.verification_status === "pending",
    )
  )
    return "pending";
  return "approved";
}
