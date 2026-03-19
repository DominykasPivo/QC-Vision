import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MaterialIcon } from "./MaterialIcon";
import { useMatrixColumns } from "@/hooks/useMatrixColumns";
import { MatrixTable } from "./qc-matrix/MatrixTable";
import { ColumnDropdown } from "./qc-matrix/ColumnDropdown";
import type { QCMatrixCardProps } from "./qc-matrix/QCMatrixCard.types";

export function QCMatrixCard({
  testId,
  colors,
  photos,
  matrixColumns,
}: QCMatrixCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const matrixState = useMatrixColumns({ testId, matrixColumns });

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
              <ColumnDropdown
                ref={dropdownRef}
                isOpen={dropdownOpen}
                onToggle={() => setDropdownOpen((prev) => !prev)}
                onClose={() => setDropdownOpen(false)}
                {...matrixState}
              />
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
        <CardContent className="py-4 md:px-8 md:py-6">
          {matrixState.noneVisible ? (
            <p className="text-sm text-slate-400 text-center py-4 px-4">
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
            <MatrixTable
              colors={colors}
              photos={photos}
              effectiveCols={matrixState.effectiveCols}
              hasIndividualCols={matrixState.hasIndividualCols}
              customColumns={matrixState.customColumns}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
