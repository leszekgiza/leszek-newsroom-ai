"use client";

import { cn } from "@/lib/utils";

export interface SourceFilterItem {
  id: string | null; // null = "All"
  name: string;
  count: number;
}

interface SourceFilterProps {
  sources: SourceFilterItem[];
  activeSourceId: string | null;
  onFilterChange: (sourceId: string | null) => void;
}

export function SourceFilter({
  sources,
  activeSourceId,
  onFilterChange,
}: SourceFilterProps) {
  return (
    <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border">
      {sources.map((source) => {
        const isActive = source.id === activeSourceId;

        return (
          <button
            key={source.id ?? "all"}
            onClick={() => onFilterChange(source.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-1.5",
              isActive
                ? "bg-primary text-card"
                : "bg-surface text-muted hover:bg-border/50"
            )}
          >
            {source.name}
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                isActive ? "bg-white/20" : "bg-border"
              )}
            >
              {source.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
