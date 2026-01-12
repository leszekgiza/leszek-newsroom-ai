"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, X } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find active source
  const activeSource = sources.find((s) => s.id === activeSourceId) || sources[0];
  const hasFilter = activeSourceId !== null;

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center gap-3">
        {/* Dropdown */}
        <div ref={dropdownRef} className="relative flex-1 max-w-xs">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-left",
              hasFilter
                ? "border-accent bg-accent/10 text-primary"
                : "border-border bg-surface text-muted hover:border-muted"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-medium">
                {activeSource?.name || "Wszystkie"}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                  hasFilter ? "bg-accent/20 text-accent" : "bg-border text-muted"
                )}
              >
                {activeSource?.count || 0}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 flex-shrink-0 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
              {sources.map((source) => {
                const isActive = source.id === activeSourceId;
                return (
                  <button
                    key={source.id ?? "all"}
                    onClick={() => {
                      onFilterChange(source.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface transition-colors",
                      isActive && "bg-accent/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          isActive ? "text-accent" : "text-primary"
                        )}
                      >
                        {source.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs",
                          isActive ? "bg-accent/20 text-accent" : "bg-border text-muted"
                        )}
                      >
                        {source.count}
                      </span>
                      {isActive && <Check className="w-4 h-4 text-accent" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear filter button */}
        {hasFilter && (
          <button
            onClick={() => onFilterChange(null)}
            className="p-2 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            title="Wyczysc filtr"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Quick filter chips for popular sources (mobile scroll, desktop wrap) */}
        <div className="hidden md:flex flex-wrap gap-2">
          {sources.slice(1, 5).map((source) => {
            const isActive = source.id === activeSourceId;
            return (
              <button
                key={source.id ?? "chip"}
                onClick={() => onFilterChange(isActive ? null : source.id)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-1.5",
                  isActive
                    ? "bg-accent text-white"
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
      </div>
    </div>
  );
}
