"use client";

import { SearchBar } from "@/components/layout/SearchBar";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { ArticleList } from "@/components/articles/ArticleList";
import { SourceFilter } from "@/components/articles/SourceFilter";
import { SummaryModal } from "@/components/summary/SummaryModal";
import { useArticles } from "@/hooks/useArticles";
import { useUIStore } from "@/stores/uiStore";

export default function HomePage() {
  const { searchQuery, activeSourceFilter, setActiveSourceFilter } = useUIStore();
  const {
    isSummaryModalOpen,
    selectedArticleId,
    openSummaryModal,
    closeSummaryModal,
  } = useUIStore();

  const { articles, sources, isLoading, toggleSave, markAsRead, dismissArticle } = useArticles({
    sourceId: activeSourceFilter,
    search: searchQuery,
  });

  return (
    <>
      {/* Desktop Header - only visible on lg: */}
      <DesktopHeader />

      {/* Mobile Search - hidden on lg: */}
      <div className="lg:hidden">
        <SearchBar />
      </div>

      {/* Source Filter with desktop styling */}
      <div className="lg:px-8 lg:py-3 lg:border-b lg:border-border/50 lg:bg-card/95 lg:backdrop-blur-sm lg:sticky lg:top-[73px] lg:z-30">
        <SourceFilter
          sources={sources}
          activeSourceId={activeSourceFilter}
          onFilterChange={setActiveSourceFilter}
        />
      </div>

      {/* Articles Container */}
      <div className="lg:p-8">
        <ArticleList
          articles={articles}
          isLoading={isLoading}
          onOpenSummary={openSummaryModal}
          onToggleSave={toggleSave}
          onMarkAsRead={markAsRead}
          onDismiss={dismissArticle}
        />
      </div>

      <SummaryModal
        articleId={selectedArticleId}
        isOpen={isSummaryModalOpen}
        onClose={closeSummaryModal}
        onToggleSave={toggleSave}
      />
    </>
  );
}
