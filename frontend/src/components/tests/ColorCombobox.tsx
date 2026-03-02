import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import type { Color } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ColorComboboxProps {
  colors: Color[];
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  triggerClassName?: string;
}

export function ColorCombobox({
  colors,
  value,
  onChange,
  disabled = false,
  triggerClassName,
}: ColorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedColors = colors.filter((c) => value.includes(c.id));

  const filtered = search.trim()
    ? colors.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : colors;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const handleToggle = (color: Color) => {
    if (value.includes(color.id)) {
      onChange(value.filter((id) => id !== color.id));
    } else {
      onChange([...value, color.id]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (open) setSearch("");
          setOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName,
        )}
      >
        {selectedColors.length > 0 ? (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {selectedColors.slice(0, 3).map((c) => (
              <span
                key={c.id}
                className="inline-block h-4 w-4 shrink-0 rounded-full border border-slate-300"
                style={{ backgroundColor: c.hexValue }}
                title={c.name}
              />
            ))}
            {selectedColors.length > 3 && (
              <span className="shrink-0 text-xs text-slate-500">
                +{selectedColors.length - 3}
              </span>
            )}
            <span className="ml-1 truncate text-slate-700">
              {selectedColors.length === 1
                ? selectedColors[0].name
                : `${selectedColors.length} colors`}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Select colors</span>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {selectedColors.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleClear(e as unknown as React.MouseEvent)
              }
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[300] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search colors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}>
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-slate-400">
                No colors found
              </li>
            ) : (
              filtered.map((color) => {
                const isSelected = value.includes(color.id);
                return (
                  <li key={color.id}>
                    <button
                      type="button"
                      onClick={() => handleToggle(color)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50",
                        isSelected && "bg-slate-50 font-semibold",
                      )}
                    >
                      <span
                        className="inline-block h-4 w-4 shrink-0 rounded-full border border-slate-300"
                        style={{ backgroundColor: color.hexValue }}
                      />
                      <span className="flex-1 text-left">{color.name}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-[#2563eb]" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
