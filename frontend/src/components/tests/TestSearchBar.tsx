import { type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TestSearchBarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
}

export function TestSearchBar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onClearSearch,
}: TestSearchBarProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    onSearchInputChange(nextValue);
    if (nextValue.trim() === "") {
      onClearSearch();
    }
  };

  return (
    <form
      className="rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFF] p-4 md:p-5"
      onSubmit={onSearchSubmit}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex h-[52px] items-center gap-3 rounded-[14px] border border-[#DBE4EF] bg-white px-4 lg:h-[68px] lg:px-5 lg:flex-1">
          <Search className="h-5 w-5 shrink-0 text-[#94A3B8] lg:h-6 lg:w-6" />
          <Input
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            placeholder="Search for ID, Product..."
            className="h-full border-0 bg-transparent px-0 text-base font-medium text-slate-700 placeholder:text-[#94A3B8] focus-visible:ring-0 lg:text-[16px]"
          />
        </div>

        <Button
          type="submit"
          className="h-[52px] w-full rounded-[14px] bg-[#2563EB] text-base font-semibold text-white hover:bg-[#1D4ED8] lg:h-[68px] lg:w-[210px] lg:text-[18px]"
        >
          Search
        </Button>
      </div>
    </form>
  );
}
