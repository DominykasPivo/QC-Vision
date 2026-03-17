import { useState, useRef } from "react";
import { PRINT_TYPES, ALL_METHODS } from "@/lib/constants/printTypes";
import { parseColumns } from "@/components/tests/qc-matrix/QCMatrixCard.helpers";
import type {
  CustomColumnDef,
  EffectiveCol,
} from "@/components/tests/qc-matrix/QCMatrixCard.types";

interface UseMatrixColumnsOptions {
  testId: string;
  matrixColumns: string | null;
}

export function useMatrixColumns({
  testId,
  matrixColumns,
}: UseMatrixColumnsOptions) {
  const initial = parseColumns(matrixColumns);

  const [selectedMethodKeys, setSelectedMethodKeys] = useState<Set<string>>(
    initial.methods,
  );
  const [mergedGroupKeys, setMergedGroupKeys] = useState<Set<string>>(
    initial.merged,
  );
  const [customColumns, setCustomColumns] = useState<CustomColumnDef[]>(
    initial.customColumns,
  );
  const [selectedCustomMethodKeys, setSelectedCustomMethodKeys] = useState<
    Set<string>
  >(initial.customMethods);
  const [mergedCustomGroupKeys, setMergedCustomGroupKeys] = useState<
    Set<string>
  >(initial.customMerged);
  const [newColumnName, setNewColumnName] = useState("");
  const [newMethodName, setNewMethodName] = useState("");
  const [addingMethodToColumn, setAddingMethodToColumn] = useState<
    string | null
  >(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(
    methods: Set<string>,
    merged: Set<string>,
    customCols: CustomColumnDef[],
    customMethods: Set<string>,
    customMerged: Set<string>,
  ) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/v1/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrix_columns: JSON.stringify({
            methods: [...methods],
            merged: [...merged],
            customColumns: customCols,
            customMethods: [...customMethods],
            customMerged: [...customMerged],
          }),
        }),
      });
    }, 800);
  }

  function toggleMethod(key: string) {
    const next = new Set(selectedMethodKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedMethodKeys(next);
    scheduleSave(
      next,
      mergedGroupKeys,
      customColumns,
      selectedCustomMethodKeys,
      mergedCustomGroupKeys,
    );
  }

  function toggleCustomMethod(key: string) {
    const next = new Set(selectedCustomMethodKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedCustomMethodKeys(next);
    scheduleSave(
      selectedMethodKeys,
      mergedGroupKeys,
      customColumns,
      next,
      mergedCustomGroupKeys,
    );
  }

  function togglePrintType(ptKey: string) {
    const pt = PRINT_TYPES.find((p) => p.key === ptKey);
    if (!pt) return;
    if (mergedGroupKeys.has(ptKey)) {
      const nextMerged = new Set(mergedGroupKeys);
      nextMerged.delete(ptKey);
      setMergedGroupKeys(nextMerged);
      scheduleSave(
        selectedMethodKeys,
        nextMerged,
        customColumns,
        selectedCustomMethodKeys,
        mergedCustomGroupKeys,
      );
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
      scheduleSave(
        next,
        mergedGroupKeys,
        customColumns,
        selectedCustomMethodKeys,
        mergedCustomGroupKeys,
      );
    }
  }

  function toggleCustomColumnGroup(customKey: string) {
    const customCol = customColumns.find((c) => c.key === customKey);
    if (!customCol) return;
    if (mergedCustomGroupKeys.has(customKey)) {
      const nextMerged = new Set(mergedCustomGroupKeys);
      nextMerged.delete(customKey);
      setMergedCustomGroupKeys(nextMerged);
      scheduleSave(
        selectedMethodKeys,
        mergedGroupKeys,
        customColumns,
        selectedCustomMethodKeys,
        nextMerged,
      );
    } else {
      const allSelected = customCol.methods.every(
        (m: { key: string; label: string }) =>
          selectedCustomMethodKeys.has(m.key),
      );
      const next = new Set(selectedCustomMethodKeys);
      for (const m of customCol.methods) {
        if (allSelected) next.delete(m.key);
        else next.add(m.key);
      }
      setSelectedCustomMethodKeys(next);
      scheduleSave(
        selectedMethodKeys,
        mergedGroupKeys,
        customColumns,
        next,
        mergedCustomGroupKeys,
      );
    }
  }

  function mergeGroup(ptKey: string) {
    const nextMerged = new Set(mergedGroupKeys);
    nextMerged.add(ptKey);
    setMergedGroupKeys(nextMerged);
    scheduleSave(
      selectedMethodKeys,
      nextMerged,
      customColumns,
      selectedCustomMethodKeys,
      mergedCustomGroupKeys,
    );
  }

  function splitGroup(ptKey: string) {
    const nextMerged = new Set(mergedGroupKeys);
    nextMerged.delete(ptKey);
    const pt = PRINT_TYPES.find((p) => p.key === ptKey);
    const nextMethods = new Set(selectedMethodKeys);
    if (pt) for (const m of pt.methods) nextMethods.add(m.key);
    setMergedGroupKeys(nextMerged);
    setSelectedMethodKeys(nextMethods);
    scheduleSave(
      nextMethods,
      nextMerged,
      customColumns,
      selectedCustomMethodKeys,
      mergedCustomGroupKeys,
    );
  }

  function mergeCustomGroup(customKey: string) {
    const nextMerged = new Set(mergedCustomGroupKeys);
    nextMerged.add(customKey);
    setMergedCustomGroupKeys(nextMerged);
    scheduleSave(
      selectedMethodKeys,
      mergedGroupKeys,
      customColumns,
      selectedCustomMethodKeys,
      nextMerged,
    );
  }

  function splitCustomGroup(customKey: string) {
    const nextMerged = new Set(mergedCustomGroupKeys);
    nextMerged.delete(customKey);
    const customCol = customColumns.find((c) => c.key === customKey);
    const nextMethods = new Set(selectedCustomMethodKeys);
    if (customCol) for (const m of customCol.methods) nextMethods.add(m.key);
    setMergedCustomGroupKeys(nextMerged);
    setSelectedCustomMethodKeys(nextMethods);
    scheduleSave(
      selectedMethodKeys,
      mergedGroupKeys,
      customColumns,
      nextMethods,
      nextMerged,
    );
  }

  function selectAll() {
    const next = new Set(ALL_METHODS.map((m) => m.key));
    const allCustomMethods = new Set(
      customColumns.flatMap((c) =>
        c.methods.map((m: { key: string; label: string }) => m.key),
      ),
    );
    setSelectedMethodKeys(next);
    setSelectedCustomMethodKeys(allCustomMethods);
    setMergedGroupKeys(new Set());
    setMergedCustomGroupKeys(new Set());
    scheduleSave(next, new Set(), customColumns, allCustomMethods, new Set());
  }

  function clearAll() {
    setSelectedMethodKeys(new Set());
    setSelectedCustomMethodKeys(new Set());
    setMergedGroupKeys(new Set());
    setMergedCustomGroupKeys(new Set());
    scheduleSave(new Set(), new Set(), customColumns, new Set(), new Set());
  }

  function handleAddCustomColumn() {
    if (!newColumnName.trim()) return;

    const columnKey = newColumnName.trim().toLowerCase().replace(/\s+/g, "_");
    const displayName = newColumnName.trim();

    if (customColumns.some((col) => col.key === columnKey)) {
      alert("A column with this name already exists.");
      return;
    }

    const newColumn: CustomColumnDef = {
      key: columnKey,
      label: displayName,
      methods: [],
    };

    const updatedColumns = [...customColumns, newColumn];
    setCustomColumns(updatedColumns);
    setNewColumnName("");
    scheduleSave(
      selectedMethodKeys,
      mergedGroupKeys,
      updatedColumns,
      selectedCustomMethodKeys,
      mergedCustomGroupKeys,
    );
  }

  function handleAddMethodToColumn(customKey: string) {
    if (!newMethodName.trim()) return;

    const methodKey = `${customKey}_${newMethodName.trim().toLowerCase().replace(/\s+/g, "_")}`;
    const methodLabel = newMethodName.trim();

    const updatedColumns = customColumns.map((col) => {
      if (col.key === customKey) {
        if (
          col.methods.some(
            (m: { key: string; label: string }) => m.key === methodKey,
          )
        ) {
          alert("A method with this name already exists.");
          return col;
        }
        return {
          ...col,
          methods: [...col.methods, { key: methodKey, label: methodLabel }],
        };
      }
      return col;
    });

    setCustomColumns(updatedColumns);
    setNewMethodName("");
    setAddingMethodToColumn(null);

    const nextMethods = new Set(selectedCustomMethodKeys);
    nextMethods.add(methodKey);
    setSelectedCustomMethodKeys(nextMethods);

    scheduleSave(
      selectedMethodKeys,
      mergedGroupKeys,
      updatedColumns,
      nextMethods,
      mergedCustomGroupKeys,
    );
  }

  function handleRemoveCustomColumn(columnKey: string) {
    const column = customColumns.find((c) => c.key === columnKey);
    if (!confirm(`Remove "${column?.label}" column and all its methods?`)) {
      return;
    }

    const updatedColumns = customColumns.filter((col) => col.key !== columnKey);
    setCustomColumns(updatedColumns);

    const methodsToRemove =
      column?.methods.map((m: { key: string; label: string }) => m.key) || [];
    const nextMethods = new Set(selectedCustomMethodKeys);
    methodsToRemove.forEach((key: string) => nextMethods.delete(key));
    setSelectedCustomMethodKeys(nextMethods);

    const nextMerged = new Set(mergedCustomGroupKeys);
    nextMerged.delete(columnKey);
    setMergedCustomGroupKeys(nextMerged);

    scheduleSave(
      selectedMethodKeys,
      mergedGroupKeys,
      updatedColumns,
      nextMethods,
      nextMerged,
    );
  }

  function handleRemoveMethodFromColumn(customKey: string, methodKey: string) {
    const updatedColumns = customColumns.map((col) => {
      if (col.key === customKey) {
        return {
          ...col,
          methods: col.methods.filter(
            (m: { key: string; label: string }) => m.key !== methodKey,
          ),
        };
      }
      return col;
    });

    setCustomColumns(updatedColumns);

    const nextMethods = new Set(selectedCustomMethodKeys);
    nextMethods.delete(methodKey);
    setSelectedCustomMethodKeys(nextMethods);

    scheduleSave(
      selectedMethodKeys,
      mergedGroupKeys,
      updatedColumns,
      nextMethods,
      mergedCustomGroupKeys,
    );
  }

  // Derived state - calculate effective columns
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

  // Add custom columns
  for (const customCol of customColumns) {
    // Empty columns are merged, single/multiple methods show individually unless explicitly merged
    const isCustomMerged =
      mergedCustomGroupKeys.has(customCol.key) ||
      customCol.methods.length === 0;

    if (isCustomMerged) {
      // Show custom column if: explicitly merged, has no methods (empty), or has at least one selected method
      if (
        mergedCustomGroupKeys.has(customCol.key) ||
        customCol.methods.length === 0 ||
        customCol.methods.some((m: { key: string; label: string }) =>
          selectedCustomMethodKeys.has(m.key),
        )
      ) {
        effectiveCols.push({
          kind: "custom-merged",
          customKey: customCol.key,
          customLabel: customCol.label,
          methodKeys: customCol.methods.map(
            (m: { key: string; label: string }) => m.key,
          ),
        });
      }
    } else {
      for (const m of customCol.methods) {
        if (selectedCustomMethodKeys.has(m.key)) {
          effectiveCols.push({
            kind: "custom-method",
            customKey: customCol.key,
            methodKey: m.key,
            methodLabel: m.label,
          });
        }
      }
    }
  }

  const hasIndividualCols = effectiveCols.some(
    (col) => col.kind === "method" || col.kind === "custom-method",
  );
  const noneVisible = effectiveCols.length === 0;
  const allVisible =
    mergedGroupKeys.size === 0 &&
    ALL_METHODS.every((m) => selectedMethodKeys.has(m.key));

  return {
    // State
    selectedMethodKeys,
    mergedGroupKeys,
    customColumns,
    selectedCustomMethodKeys,
    mergedCustomGroupKeys,
    newColumnName,
    setNewColumnName,
    newMethodName,
    setNewMethodName,
    addingMethodToColumn,
    setAddingMethodToColumn,

    // Derived state
    effectiveCols,
    hasIndividualCols,
    noneVisible,
    allVisible,

    // Actions
    toggleMethod,
    toggleCustomMethod,
    togglePrintType,
    toggleCustomColumnGroup,
    mergeGroup,
    splitGroup,
    mergeCustomGroup,
    splitCustomGroup,
    selectAll,
    clearAll,
    handleAddCustomColumn,
    handleAddMethodToColumn,
    handleRemoveCustomColumn,
    handleRemoveMethodFromColumn,
  };
}
