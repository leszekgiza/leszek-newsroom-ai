import { SearchBar } from "@/components/layout/SearchBar";
import { ArticleCardSkeleton } from "@/components/ui/Skeleton";

export default function HomePage() {
  return (
    <>
      <SearchBar />

      {/* Filter Bar */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border">
        <button className="px-4 py-2 bg-primary text-card text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-1.5">
          Wszystkie
          <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">0</span>
        </button>
      </div>

      {/* Article List */}
      <div className="p-4 space-y-4">
        {/* Empty state */}
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-muted mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-primary mb-2">
            Brak artykułów
          </h3>
          <p className="text-muted text-sm max-w-xs mx-auto">
            Dodaj źródła w ustawieniach, aby zacząć śledzić najnowsze artykuły.
          </p>
        </div>

        {/* Loading skeleton preview (hidden) */}
        <div className="hidden">
          <ArticleCardSkeleton />
          <ArticleCardSkeleton />
          <ArticleCardSkeleton />
        </div>
      </div>
    </>
  );
}
