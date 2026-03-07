import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MaterialIcon } from "./MaterialIcon";
import {
  PRINT_TYPES,
  ALL_METHODS,
  METHOD_TO_TYPE_KEY,
} from "@/lib/constants/printTypes";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import type { Color } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QCMatrixCardProps {
  testId: string;
  colors: Color[];
  photos: ApiPhoto[];
  matrixColumns: string | null;
}

type EffectiveCol =
  | {
      kind: "merged";
      ptKey: string;
      ptLabel: string;
      methodKeys: readonly string[];
    }
  | { kind: "method"; ptKey: string; methodKey: string; methodLabel: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseColumns(raw: string | null): {
  methods: Set<string>;
  merged: Set<string>;
} {
  try {
    if (raw) {
      const parsed = JSON.parse(raw) as {
        methods?: string[];
        merged?: string[];
      };
      return {
        methods: new Set(parsed.methods ?? ALL_METHODS.map((m) => m.key)),
        merged: new Set(parsed.merged ?? []),
      };
    }
  } catch {
    // Ignore parsing errors and return defaults
  }
  return {
    methods: new Set(ALL_METHODS.map((m) => m.key)),
    merged: new Set<string>(),
  };
}

function getCellStatus(cellPhotos: ApiPhoto[]) {
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

// ─── Component ───────────────────────────────────────────────────────────────

export function QCMatrixCard({
  testId,
  colors,
  photos,
  matrixColumns,
}: QCMatrixCardProps) {
  const initial = parseColumns(matrixColumns);
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [selectedMethodKeys, setSelectedMethodKeys] = useState<Set<string>>(
    initial.methods,
  );
  const [mergedGroupKeys, setMergedGroupKeys] = useState<Set<string>>(
    initial.merged,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  if (colors.length === 0) return null;

  // ─── Derived state ────────────────────────────────────────────────────────

  // A group is "effectively merged" if manually merged OR has only one method
  function isEffectivelyMerged(ptKey: string): boolean {
    const pt = PRINT_TYPES.find((p) => p.key === ptKey);
    return mergedGroupKeys.has(ptKey) || (pt?.methods.length ?? 0) === 1;
  }

  const effectiveCols: EffectiveCol[] = [];
  for (const pt of PRINT_TYPES) {
    if (isEffectivelyMerged(pt.key)) {
      if (
        mergedGroupKeys.has(pt.key) ||
        pt.methods.some((m) => selectedMethodKeys.has(m.key))
      ) {
        effectiveCols.push({
          kind: "merged",
          ptKey: pt.key,
          ptLabel: pt.label,
          methodKeys: pt.methods.map((m) => m.key),
        });
      }
    } else {
      for (const m of pt.methods) {
        if (selectedMethodKeys.has(m.key)) {
          effectiveCols.push({
            kind: "method",
            ptKey: pt.key,
            methodKey: m.key,
            methodLabel: m.label,
          });
        }
      }
    }
  }

  const hasIndividualCols = effectiveCols.some((col) => col.kind === "method");
  const noneVisible = effectiveCols.length === 0;
  const allVisible =
    mergedGroupKeys.size === 0 &&
    ALL_METHODS.every((m) => selectedMethodKeys.has(m.key));

  const visiblePtKeys: string[] = [];
  const ptColMap = new Map<string, EffectiveCol[]>();
  for (const col of effectiveCols) {
    if (!ptColMap.has(col.ptKey)) {
      ptColMap.set(col.ptKey, []);
      visiblePtKeys.push(col.ptKey);
    }
    ptColMap.get(col.ptKey)!.push(col);
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  function scheduleSave(methods: Set<string>, merged: Set<string>) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/v1/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrix_columns: JSON.stringify({
            methods: [...methods],
            merged: [...merged],
          }),
        }),
      });
    }, 800);
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function toggleMethod(key: string) {
    const next = new Set(selectedMethodKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedMethodKeys(next);
    scheduleSave(next, mergedGroupKeys);
  }

  function togglePrintType(ptKey: string) {
    const pt = PRINT_TYPES.find((p) => p.key === ptKey);
    if (!pt) return;
    if (mergedGroupKeys.has(ptKey)) {
      const nextMerged = new Set(mergedGroupKeys);
      nextMerged.delete(ptKey);
      setMergedGroupKeys(nextMerged);
      scheduleSave(selectedMethodKeys, nextMerged);
    } else {
      const allPtSelected = pt.methods.every((m) =>
        selectedMethodKeys.has(m.key),
      );
      const next = new Set(selectedMethodKeys);
      for (const m of pt.methods) {
        if (allPtSelected) next.delete(m.key);
        else next.add(m.key);
      }
      setSelectedMethodKeys(next);
      scheduleSave(next, mergedGroupKeys);
    }
  }

  function mergeGroup(ptKey: string) {
    const nextMerged = new Set(mergedGroupKeys);
    nextMerged.add(ptKey);
    setMergedGroupKeys(nextMerged);
    scheduleSave(selectedMethodKeys, nextMerged);
  }

  function splitGroup(ptKey: string) {
    const nextMerged = new Set(mergedGroupKeys);
    nextMerged.delete(ptKey);
    const pt = PRINT_TYPES.find((p) => p.key === ptKey);
    const nextMethods = new Set(selectedMethodKeys);
    if (pt) for (const m of pt.methods) nextMethods.add(m.key);
    setMergedGroupKeys(nextMerged);
    setSelectedMethodKeys(nextMethods);
    scheduleSave(nextMethods, nextMerged);
  }

  function selectAll() {
    const next = new Set(ALL_METHODS.map((m) => m.key));
    setSelectedMethodKeys(next);
    setMergedGroupKeys(new Set());
    scheduleSave(next, new Set());
  }

  function clearAll() {
    setSelectedMethodKeys(new Set());
    setMergedGroupKeys(new Set());
    scheduleSave(new Set(), new Set());
  }

  // ─── Cell renderer ────────────────────────────────────────────────────────

  function renderCell(cellPhotos: ApiPhoto[], cellId: string) {
    const isExpanded = expandedCell === cellId;
    const status = getCellStatus(cellPhotos);

    return (
      <td
        key={cellId}
        className={`border border-slate-200 px-1 py-1 text-center align-middle ${
          status === "rejected"
            ? "bg-red-50"
            : status === "pending"
              ? "bg-yellow-50"
              : status === "approved"
                ? "bg-emerald-50"
                : ""
        }`}
      >
        {cellPhotos.length === 0 ? (
          <span className="text-emerald-400 text-base font-bold">✓</span>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-0.5 flex-wrap justify-center">
              {cellPhotos.slice(0, 2).map((p) => (
                <Link
                  key={p.id}
                  to={`/photos/${p.id}`}
                  className="relative block h-10 w-10 overflow-hidden rounded border border-slate-200 hover:opacity-80"
                  title={`Photo ${p.id} - ${p.verification_status || "pending"}`}
                >
                  {p.url ? (
                    <img
                      src={p.url}
                      alt={`Photo ${p.id}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400 text-[10px]">
                      {p.id}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white ${
                      p.verification_status === "approved"
                        ? "bg-emerald-500"
                        : p.verification_status === "rejected"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                    }`}
                    title={p.verification_status || "pending"}
                  />
                </Link>
              ))}
            </div>
            {cellPhotos.length > 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setExpandedCell(isExpanded ? null : cellId)}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-200 active:bg-blue-300 transition-colors touch-manipulation"
                  title={isExpanded ? "Hide photos" : "Show all photos"}
                >
                  {isExpanded ? "−" : "+"}
                  {cellPhotos.length - 2}
                </button>
                {isExpanded && (
                  <div className="mt-1 p-1.5 bg-slate-50 rounded border border-slate-200">
                    <div className="grid grid-cols-3 gap-1">
                      {cellPhotos.slice(2).map((p) => (
                        <Link
                          key={p.id}
                          to={`/photos/${p.id}`}
                          className="relative block h-10 w-10 overflow-hidden rounded border border-slate-200 hover:opacity-80"
                          title={`Photo ${p.id} - ${p.verification_status || "pending"}`}
                        >
                          {p.url ? (
                            <img
                              src={p.url}
                              alt={`Photo ${p.id}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400 text-[10px]">
                              {p.id}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white ${
                              p.verification_status === "approved"
                                ? "bg-emerald-500"
                                : p.verification_status === "rejected"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }`}
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </td>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Title — click to collapse */}
          <button
            type="button"
            className="flex items-center gap-2 text-left"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <MaterialIcon name="grid_on" className="text-[#2563eb]" />
              QC Matrix
            </CardTitle>
          </button>

          <div className="flex items-center gap-2">
            {/* Columns dropdown — only visible when expanded */}
            {isOpen && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <MaterialIcon name="tune" className="text-sm" />
                  Columns
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-xl border border-slate-200 bg-white shadow-lg">
                    {/* Sticky header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Visible columns
                      </span>
                      <div className="flex gap-3 text-[11px]">
                        <button
                          type="button"
                          onClick={selectAll}
                          disabled={allVisible}
                          className="text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={clearAll}
                          disabled={noneVisible}
                          className="text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>

                    {/* Print type groups — 2-column grid */}
                    {(() => {
                      const renderGroup = (
                        pt: (typeof PRINT_TYPES)[number],
                      ) => {
                        const isMerged = mergedGroupKeys.has(pt.key);
                        const isMultiMethod = pt.methods.length > 1;
                        const allPtSelected =
                          isMerged ||
                          pt.methods.every((m) =>
                            selectedMethodKeys.has(m.key),
                          );
                        const somePtSelected =
                          isMerged ||
                          pt.methods.some((m) => selectedMethodKeys.has(m.key));
                        return (
                          <div key={pt.key}>
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 accent-blue-600"
                                checked={allPtSelected}
                                ref={(el) => {
                                  if (el)
                                    el.indeterminate =
                                      !isMerged &&
                                      somePtSelected &&
                                      !allPtSelected;
                                }}
                                onChange={() => togglePrintType(pt.key)}
                              />
                              <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                {pt.label}
                              </span>
                              {isMerged && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                                  Merged
                                </span>
                              )}
                            </label>
                            {isMultiMethod && (
                              <div className="ml-5 mt-1 space-y-1">
                                {isMerged ? (
                                  <button
                                    type="button"
                                    onClick={() => splitGroup(pt.key)}
                                    className="text-[11px] text-blue-600 hover:underline"
                                  >
                                    Split into sub-columns
                                  </button>
                                ) : (
                                  <>
                                    {pt.methods.map((m) => (
                                      <label
                                        key={m.key}
                                        className="flex cursor-pointer items-center gap-2"
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-3.5 w-3.5 accent-blue-600"
                                          checked={selectedMethodKeys.has(
                                            m.key,
                                          )}
                                          onChange={() => toggleMethod(m.key)}
                                        />
                                        <span className="text-xs text-slate-700">
                                          {m.label}
                                        </span>
                                      </label>
                                    ))}
                                    {somePtSelected && (
                                      <button
                                        type="button"
                                        onClick={() => mergeGroup(pt.key)}
                                        className="text-[11px] text-slate-400 hover:text-blue-600 hover:underline"
                                      >
                                        Merge into one column
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      };

                      const byKey = Object.fromEntries(
                        PRINT_TYPES.map((pt) => [pt.key, pt]),
                      ) as Record<string, (typeof PRINT_TYPES)[number]>;

                      return (
                        <div className="px-4 py-3 space-y-4">
                          {/* Row 1: DD | DTF */}
                          <div className="grid grid-cols-2 gap-x-4">
                            {renderGroup(byKey.dd)}
                            {renderGroup(byKey.dtf)}
                          </div>
                          {/* Row 2: Flex | EMB + Washing stacked */}
                          <div className="grid grid-cols-2 gap-x-4">
                            {renderGroup(byKey.flex)}
                            <div className="space-y-3">
                              {renderGroup(byKey.emb)}
                              {renderGroup(byKey.washing)}
                            </div>
                          </div>
                          {/* Row 3: UV/Sub | Dish Washer */}
                          <div className="grid grid-cols-2 gap-x-4">
                            {renderGroup(byKey.uv_sub)}
                            {renderGroup(byKey.dish_washer)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Collapse chevron */}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="text-slate-500 hover:text-slate-700"
            >
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="px-4 py-4 md:px-8 md:py-6">
          {noneVisible ? (
            <p className="text-sm text-slate-400 text-center py-4">
              No columns selected. Use the{" "}
              <button
                type="button"
                onClick={() => setDropdownOpen(true)}
                className="text-blue-600 hover:underline"
              >
                Columns
              </button>{" "}
              menu to choose which print methods to show.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  {/* Row 1: group headers */}
                  <tr>
                    <th
                      rowSpan={hasIndividualCols ? 2 : 1}
                      className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-3 py-2 text-left text-slate-500 font-medium min-w-[100px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
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
                          rowSpan={
                            isMergedCol ? (hasIndividualCols ? 2 : 1) : 1
                          }
                          className="border border-slate-200 bg-blue-50 px-2 py-2 text-center font-semibold text-blue-700"
                        >
                          {pt.label}
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
                          ): col is Extract<EffectiveCol, { kind: "method" }> =>
                            col.kind === "method",
                        )
                        .map((col) => (
                          <th
                            key={col.methodKey}
                            className="border border-slate-200 bg-slate-50 px-2 py-2 text-center font-medium text-slate-600 whitespace-nowrap"
                          >
                            {col.methodLabel}
                          </th>
                        ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {colors.map((color) => (
                    <tr key={color.id}>
                      <td className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-slate-300"
                            style={{ backgroundColor: color.hexValue }}
                          />
                          {color.name}
                        </div>
                      </td>
                      {effectiveCols.map((col) => {
                        const cellId =
                          col.kind === "merged"
                            ? `${color.id}-${col.ptKey}`
                            : `${color.id}-${col.methodKey}`;

                        const cellPhotos =
                          col.kind === "merged"
                            ? photos.filter(
                                (p) =>
                                  p.color_id === color.id &&
                                  (col.methodKeys.includes(p.method ?? "") ||
                                    p.method === col.ptKey),
                              )
                            : photos.filter(
                                (p) =>
                                  p.color_id === color.id &&
                                  (p.method === col.methodKey ||
                                    p.method ===
                                      METHOD_TO_TYPE_KEY[col.methodKey]),
                              );

                        return renderCell(cellPhotos, cellId);
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
