import { forwardRef } from "react";
import { ChevronDown, Plus, X, Minus as RemoveIcon } from "lucide-react";
import { MaterialIcon } from "../MaterialIcon";
import { PRINT_TYPES } from "@/lib/constants/printTypes";
import type { CustomColumnDef } from "./QCMatrixCard.types";

interface ColumnDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;

  // Column state
  selectedMethodKeys: Set<string>;
  mergedGroupKeys: Set<string>;
  customColumns: CustomColumnDef[];
  selectedCustomMethodKeys: Set<string>;
  mergedCustomGroupKeys: Set<string>;
  newColumnName: string;
  setNewColumnName: (value: string) => void;
  newMethodName: string;
  setNewMethodName: (value: string) => void;
  addingMethodToColumn: string | null;
  setAddingMethodToColumn: (value: string | null) => void;

  // Derived state
  allVisible: boolean;
  noneVisible: boolean;

  // Actions
  toggleMethod: (key: string) => void;
  togglePrintType: (key: string) => void;
  toggleCustomMethod: (key: string) => void;
  toggleCustomColumnGroup: (key: string) => void;
  mergeGroup: (key: string) => void;
  splitGroup: (key: string) => void;
  mergeCustomGroup: (key: string) => void;
  splitCustomGroup: (key: string) => void;
  selectAll: () => void;
  clearAll: () => void;
  handleAddCustomColumn: () => void;
  handleAddMethodToColumn: (columnKey: string) => void;
  handleRemoveCustomColumn: (columnKey: string) => void;
  handleRemoveMethodFromColumn: (columnKey: string, methodKey: string) => void;
}

export const ColumnDropdown = forwardRef<HTMLDivElement, ColumnDropdownProps>(
  (props, ref) => {
    const {
      isOpen,
      onToggle,
      onClose,
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
      allVisible,
      noneVisible,
      toggleMethod,
      togglePrintType,
      toggleCustomMethod,
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
    } = props;

    const renderPrintTypeGroup = (pt: (typeof PRINT_TYPES)[number]) => {
      const isMerged = mergedGroupKeys.has(pt.key);
      const isMultiMethod = pt.methods.length > 1;
      const allPtSelected =
        isMerged || pt.methods.every((m) => selectedMethodKeys.has(m.key));
      const somePtSelected =
        isMerged || pt.methods.some((m) => selectedMethodKeys.has(m.key));

      return (
        <div key={pt.key}>
          <label className="flex cursor-pointer items-center gap-2 py-1 touch-manipulation">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={allPtSelected}
              ref={(el) => {
                if (el)
                  el.indeterminate =
                    !isMerged && somePtSelected && !allPtSelected;
              }}
              onChange={() => togglePrintType(pt.key)}
            />
            <span className="text-sm font-semibold uppercase tracking-wide text-blue-700">
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
                      className="flex cursor-pointer items-center gap-2 py-1 touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                        checked={selectedMethodKeys.has(m.key)}
                        onChange={() => toggleMethod(m.key)}
                      />
                      <span className="text-sm text-slate-700">{m.label}</span>
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
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <MaterialIcon name="tune" className="text-sm" />
          Columns
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={onClose}
            />
            <div className="fixed md:absolute inset-x-4 md:inset-x-auto md:right-0 top-20 md:top-full z-50 md:mt-1 rounded-xl border border-slate-200 bg-white shadow-lg md:w-96">
              {/* Sticky header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-xs md:text-xs font-semibold text-slate-500 uppercase tracking-wide">
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

              {/* Content */}
              <div className="px-4 py-3 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Print type groups — 2-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-4">
                  {renderPrintTypeGroup(byKey.dd)}
                  {renderPrintTypeGroup(byKey.dtf)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-4">
                  {renderPrintTypeGroup(byKey.flex)}
                  <div className="space-y-3">
                    {renderPrintTypeGroup(byKey.emb)}
                    {renderPrintTypeGroup(byKey.washing)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-4">
                  {renderPrintTypeGroup(byKey.uv_sub)}
                  {renderPrintTypeGroup(byKey.dish_washer)}
                </div>

                {/* Custom Columns Section */}
                <div className="border-t border-slate-200 pt-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Custom Columns
                    </span>
                  </div>

                  {/* Add new column group form */}
                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add column group..."
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCustomColumn();
                      }}
                      className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomColumn}
                      disabled={!newColumnName.trim()}
                      className="flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>

                  {/* List of custom column groups */}
                  {customColumns.length > 0 ? (
                    <div className="space-y-3">
                      {customColumns.map((col) => {
                        const isMerged = mergedCustomGroupKeys.has(col.key);
                        const isMultiMethod = col.methods.length > 1;
                        const allSelected =
                          isMerged ||
                          col.methods.every((m) =>
                            selectedCustomMethodKeys.has(m.key),
                          );
                        const someSelected =
                          isMerged ||
                          col.methods.some((m) =>
                            selectedCustomMethodKeys.has(m.key),
                          );
                        return (
                          <div key={col.key}>
                            <div className="flex items-center gap-2 py-1 group">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-purple-600"
                                checked={allSelected}
                                ref={(el) => {
                                  if (el)
                                    el.indeterminate =
                                      !isMerged && someSelected && !allSelected;
                                }}
                                onChange={() =>
                                  toggleCustomColumnGroup(col.key)
                                }
                              />
                              <span className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                                {col.label}
                              </span>
                              {isMerged && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
                                  Merged
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveCustomColumn(col.key)
                                }
                                className="ml-auto p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Remove column group"
                              >
                                <RemoveIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {isMultiMethod && (
                              <div className="ml-5 mt-1 space-y-1">
                                {isMerged ? (
                                  <button
                                    type="button"
                                    onClick={() => splitCustomGroup(col.key)}
                                    className="text-[11px] text-purple-600 hover:underline"
                                  >
                                    Split into sub-columns
                                  </button>
                                ) : (
                                  <>
                                    {col.methods.map((m) => (
                                      <div
                                        key={m.key}
                                        className="flex items-center gap-2 py-1 group/method"
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 accent-purple-600"
                                          checked={selectedCustomMethodKeys.has(
                                            m.key,
                                          )}
                                          onChange={() =>
                                            toggleCustomMethod(m.key)
                                          }
                                        />
                                        <span className="text-sm text-slate-700">
                                          {m.label}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveMethodFromColumn(
                                              col.key,
                                              m.key,
                                            )
                                          }
                                          className="ml-auto p-0.5 text-slate-400 hover:text-red-600 transition-colors"
                                          title="Remove method"
                                        >
                                          <RemoveIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                    {someSelected && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          mergeCustomGroup(col.key)
                                        }
                                        className="text-[11px] text-slate-400 hover:text-purple-600 hover:underline"
                                      >
                                        Merge into one column
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            {/* Add method to column */}
                            <div className="ml-5 mt-1">
                              {addingMethodToColumn === col.key ? (
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    placeholder="Method name..."
                                    value={newMethodName}
                                    onChange={(e) =>
                                      setNewMethodName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleAddMethodToColumn(col.key);
                                      if (e.key === "Escape") {
                                        setAddingMethodToColumn(null);
                                        setNewMethodName("");
                                      }
                                    }}
                                    className="flex-1 rounded-md border border-slate-300 px-2 py-0.5 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddMethodToColumn(col.key)
                                    }
                                    disabled={!newMethodName.trim()}
                                    className="rounded-md bg-purple-600 px-2 py-0.5 text-xs text-white hover:bg-purple-700 disabled:bg-slate-300"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingMethodToColumn(null);
                                      setNewMethodName("");
                                    }}
                                    className="rounded-md px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAddingMethodToColumn(col.key)
                                  }
                                  className="text-[11px] text-purple-600 hover:underline"
                                >
                                  + Add method
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No custom columns yet. Add one above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
);

ColumnDropdown.displayName = "ColumnDropdown";
