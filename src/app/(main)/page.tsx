"use client";

import { SearchBar } from "@/components/layout/SearchBar";
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

  const { articles, sources, isLoading, toggleSave, markAsRead } = useArticles({
    sourceId: activeSourceFilter,
    search: searchQuery,
  });

  return (
    <>
      <SearchBar />
      <SourceFilter
        sources={sources}
        activeSourceId={activeSourceFilter}
        onFilterChange={setActiveSourceFilter}
      />
      <ArticleList
        articles={articles}
        isLoading={isLoading}
        onOpenSummary={openSummaryModal}
        onToggleSave={toggleSave}
        onMarkAsRead={markAsRead}
      />
      <SummaryModal
        articleId={selectedArticleId}
        isOpen={isSummaryModalOpen}
        onClose={closeSummaryModal}
        onToggleSave={toggleSave}
      />
    </>
  );
}
