import type { ReactNode } from "react";
import { SearchInput } from "./SearchInput";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  className?: string;
}

/** Standard list-page header row: search + arbitrary filter controls. */
export function FilterBar({ search, onSearchChange, searchPlaceholder, filters, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="w-full sm:max-w-xs" />
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
    </div>
  );
}