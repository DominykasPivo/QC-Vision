import { type FormEvent } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TestsSearchBarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenFilters: () => void;
  onClearSearch: () => void;
}

export function TestsSearchBar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onOpenFilters,
  onClearSearch,
}: TestsSearchBarProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    onSearchInputChange(nextValue);
    if (nextValue.trim() === "") {
      onClearSearch();
    }
  };

  return (
    <>
      {/* Mobile search row */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex-1">
          <Input
            type="text"
            className="h-12 rounded-full border border-slate-200 bg-white px-5 text-base text-slate-900 shadow-sm placeholder:text-slate-400"
            placeholder="Search by Jira ID, Product..."
            value={searchInput}
            onChange={handleInputChange}
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-11 shrink-0 rounded-full p-0"
          aria-label="Search tests"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-11 shrink-0 rounded-full border-slate-300 bg-white p-0 text-slate-700"
          onClick={onOpenFilters}
          aria-label="Open filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop search + button */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            className="h-12 rounded-full border border-slate-200 bg-white px-5 text-[15px] leading-5 text-slate-900 shadow-sm placeholder:text-slate-500"
            placeholder="Search by Jira ID, Product..."
            value={searchInput}
            onChange={handleInputChange}
          />
        </div>
        <Button
          type="submit"
          className="h-12 rounded-full px-8 text-base font-semibold"
        >
          Search
        </Button>
      </div>
    </>
  );
}
