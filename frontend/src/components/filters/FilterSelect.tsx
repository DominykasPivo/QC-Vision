import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface FilterSelectProps {
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterSelect({
  value,
  placeholder,
  options,
  onChange,
  className = "h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]",
}: FilterSelectProps) {
  const handleFilterChange = (selectedValue: string): void => {
    const actualValue = selectedValue === "clear" ? "" : selectedValue;
    onChange(actualValue);
  };

  // Find the display label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <Select value={value || "clear"} onValueChange={handleFilterChange}>
      <SelectTrigger className={className}>
        <span className="text-sm font-semibold">{displayLabel}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="clear">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
