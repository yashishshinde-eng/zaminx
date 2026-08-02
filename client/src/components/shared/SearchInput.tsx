import { Search, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: LucideIcon;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className, icon: Icon = Search }: SearchInputProps) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}