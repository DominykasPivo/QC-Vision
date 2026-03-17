import { Input } from "@/components/ui/input";

interface FilterInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterInput({
  value,
  placeholder,
  onChange,
  className = "h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#334155] sm:w-auto lg:h-[52px] lg:px-6 lg:text-[16px]",
}: FilterInputProps) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
