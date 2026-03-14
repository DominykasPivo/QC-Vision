import { PRINT_TYPES, METHOD_TO_TYPE_KEY } from "@/lib/constants/printTypes";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import type { Color } from "@/lib/types";
import type { EffectiveCol, CustomColumnDef } from "./QCMatrixCard.types";
import { MatrixCell } from "./MatrixCell";

interface MatrixTableProps {
  colors: Color[];
  photos: ApiPhoto[];
  effectiveCols: EffectiveCol[];
  hasIndividualCols: boolean;
  customColumns: CustomColumnDef[];
}

export function MatrixTable({
  colors,
  photos,
  effectiveCols,
  hasIndividualCols,
  customColumns,
}: MatrixTableProps) {
  // Group print type columns
  const visiblePtKeys: string[] = [];
  const ptColMap = new Map<string, EffectiveCol[]>();
  for (const col of effectiveCols) {
    if (col.kind === "merged" || col.kind === "method") {
      if (!ptColMap.has(col.ptKey)) {
        ptColMap.set(col.ptKey, []);
        visiblePtKeys.push(col.ptKey);
      }
      ptColMap.get(col.ptKey)!.push(col);
    }
  }

  // Group custom columns
  const visibleCustomKeys: string[] = [];
  const customColMap = new Map<string, EffectiveCol[]>();
  for (const col of effectiveCols) {
    if (col.kind === "custom-merged" || col.kind === "custom-method") {
      if (!customColMap.has(col.customKey)) {
        customColMap.set(col.customKey, []);
        visibleCustomKeys.push(col.customKey);
      }
      customColMap.get(col.customKey)!.push(col);
    }
  }

  return (
    <div className="overflow-x-auto pr-4 md:pr-0">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          {/* Row 1: group headers */}
          <tr>
            <th
              rowSpan={hasIndividualCols ? 2 : 1}
              className="sticky left-0 md:left-0 z-10 border border-slate-200 bg-slate-50 pl-4 pr-3 md:px-3 py-2 text-left text-slate-500 font-medium min-w-[100px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
            >
              Color
            </th>
            {visiblePtKeys.map((ptKey) => {
              const cols = ptColMap.get(ptKey)!;
              const pt = PRINT_TYPES.find((p) => p.key === ptKey)!;
              const isMergedCol = cols[0].kind === "merged";
              return (
                <th
                  key={ptKey}
                  colSpan={isMergedCol ? 1 : cols.length}
                  rowSpan={isMergedCol ? (hasIndividualCols ? 2 : 1) : 1}
                  className="border border-slate-200 bg-blue-50 px-2 py-2 text-center font-semibold text-blue-700"
                >
                  {pt.label}
                </th>
              );
            })}
            {/* Custom columns headers */}
            {visibleCustomKeys.map((customKey) => {
              const cols = customColMap.get(customKey)!;
              const customCol = customColumns.find((c) => c.key === customKey)!;
              const isMergedCol = cols[0].kind === "custom-merged";
              return (
                <th
                  key={`custom-${customKey}`}
                  colSpan={isMergedCol ? 1 : cols.length}
                  rowSpan={isMergedCol ? (hasIndividualCols ? 2 : 1) : 1}
                  className="border border-slate-200 bg-purple-50 px-2 py-2 text-center font-semibold text-purple-700"
                >
                  {customCol.label}
                </th>
              );
            })}
          </tr>
          {/* Row 2: individual method sub-headers */}
          {hasIndividualCols && (
            <tr>
              {effectiveCols
                .filter(
                  (
                    col,
                  ): col is Extract<
                    EffectiveCol,
                    { kind: "method" | "custom-method" }
                  > => col.kind === "method" || col.kind === "custom-method",
                )
                .map((col) => {
                  const key =
                    col.kind === "method"
                      ? col.methodKey
                      : `${col.customKey}-${col.methodKey}`;
                  const bgColor =
                    col.kind === "method" ? "bg-slate-50" : "bg-purple-50";
                  const textColor =
                    col.kind === "method"
                      ? "text-slate-600"
                      : "text-purple-600";
                  return (
                    <th
                      key={key}
                      className={`border border-slate-200 ${bgColor} px-2 py-2 text-center font-medium ${textColor} whitespace-nowrap`}
                    >
                      {col.methodLabel}
                    </th>
                  );
                })}
            </tr>
          )}
        </thead>
        <tbody>
          {colors.map((color) => (
            <tr key={color.id}>
              <td className="sticky left-0 md:left-0 z-10 border border-slate-200 bg-white pl-4 pr-3 md:px-3 py-2 font-medium text-slate-700 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-slate-300"
                    style={{ backgroundColor: color.hexValue }}
                  />
                  {color.name}
                </div>
              </td>
              {effectiveCols.map((col) => {
                let cellId: string;
                let cellPhotos: ApiPhoto[];

                if (col.kind === "merged") {
                  cellId = `${color.id}-${col.ptKey}`;
                  cellPhotos = photos.filter(
                    (p) =>
                      p.color_id === color.id &&
                      (col.methodKeys.includes(p.method ?? "") ||
                        p.method === col.ptKey),
                  );
                } else if (col.kind === "method") {
                  cellId = `${color.id}-${col.methodKey}`;
                  cellPhotos = photos.filter(
                    (p) =>
                      p.color_id === color.id &&
                      (p.method === col.methodKey ||
                        p.method === METHOD_TO_TYPE_KEY[col.methodKey]),
                  );
                } else if (col.kind === "custom-merged") {
                  cellId = `${color.id}-custom-${col.customKey}`;
                  cellPhotos = photos.filter(
                    (p) =>
                      p.color_id === color.id &&
                      (col.methodKeys.some(
                        (mk) => p.method === `${col.customKey}_${mk}`,
                      ) ||
                        p.method === `custom_${col.customKey}`),
                  );
                } else {
                  // custom-method
                  cellId = `${color.id}-${col.methodKey}`;
                  cellPhotos = photos.filter(
                    (p) =>
                      p.color_id === color.id &&
                      (p.method === `${col.customKey}_${col.methodKey}` ||
                        p.method === `custom_${col.customKey}`),
                  );
                }

                return (
                  <MatrixCell
                    key={cellId}
                    cellPhotos={cellPhotos}
                    cellId={cellId}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
