"use client";

import { SearchBar } from "@/components/layout/SearchBar";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { ArticleList } from "@/components/articles/ArticleList";
import { SourceFilter } from "@/components/articles/SourceFilter";
import { EditionTabs } from "@/components/articles/EditionTabs";
import { SummaryModal } from "@/components/summary/SummaryModal";
import { useArticles } from "@/hooks/useArticles";
import { useUIStore } from "@/stores/uiStore";

export default function HomePage() {
  const {
    searchQuery,
    activeSourceFilter,
    setActiveSourceFilter,
    activeEditionDate,
    setActiveEditionDate,
  } = useUIStore();
  const {
    isSummaryModalOpen,
    selectedArticleId,
    openSummaryModal,
    closeSummaryModal,
  } = useUIStore();

  const {
    filteredArticles,
    sources,
    editions,
    isLoading,
    toggleSave,
    markAsRead,
    dismissArticle,
  } = useArticles({
    sourceId: activeSourceFilter,
    search: searchQuery,
    editionDate: activeEditionDate,
  });

  return (
    <>
      {/* Desktop Header - only visible on lg: */}
      <DesktopHeader />

      {/* Mobile Search - hidden on lg: */}
      <div className="lg:hidden">
        <SearchBar />
      </div>

      {/* Edition Tabs - zakładki z datami */}
      <div className="lg:px-8 lg:py-2 lg:border-b lg:border-border/50 lg:bg-card/95 lg:backdrop-blur-sm lg:sticky lg:top-[73px] lg:z-30">
        <EditionTabs
          editions={editions}
          activeDate={activeEditionDate}
          onDateChange={setActiveEditionDate}
        />
      </div>

      {/* Source Filter with desktop styling */}
      <div className="lg:px-8 lg:py-3 lg:border-b lg:border-border/50 lg:bg-card/95 lg:backdrop-blur-sm lg:sticky lg:top-[130px] lg:z-30">
        <SourceFilter
          sources={sources}
          activeSourceId={activeSourceFilter}
          onFilterChange={setActiveSourceFilter}
        />
      </div>

      {/* Articles Container */}
      <div className="lg:p-8">
        <ArticleList
          articles={filteredArticles}
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
