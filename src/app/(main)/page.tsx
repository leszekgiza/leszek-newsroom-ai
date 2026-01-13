"use client";

import { Suspense, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchBar } from "@/components/layout/SearchBar";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { ArticleList } from "@/components/articles/ArticleList";
import { SourceFilter } from "@/components/articles/SourceFilter";
import { EditionTabs } from "@/components/articles/EditionTabs";
import { SummaryModal } from "@/components/summary/SummaryModal";
import { useArticles } from "@/hooks/useArticles";
import { useUIStore } from "@/stores/uiStore";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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

  // Sync URL params to store on mount
  useEffect(() => {
    const sourceId = searchParams.get("source");
    const date = searchParams.get("date");
    
    if (sourceId !== activeSourceFilter) {
      setActiveSourceFilter(sourceId);
    }
    if (date !== activeEditionDate) {
      setActiveEditionDate(date);
    }
  }, [searchParams, setActiveSourceFilter, setActiveEditionDate, activeSourceFilter, activeEditionDate]);

  // Update URL when filter changes
  const handleSourceFilterChange = useCallback((sourceId: string | null) => {
    setActiveSourceFilter(sourceId);
    
    const params = new URLSearchParams(searchParams.toString());
    if (sourceId) {
      params.set("source", sourceId);
    } else {
      params.delete("source");
    }
    
    const newUrl = params.toString() ? "?" + params.toString() : "/";
    router.push(newUrl, { scroll: false });
  }, [searchParams, router, setActiveSourceFilter]);

  // Update URL when edition date changes
  const handleEditionDateChange = useCallback((date: string | null) => {
    setActiveEditionDate(date);
    
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", date);
    } else {
      params.delete("date");
    }
    
    const newUrl = params.toString() ? "?" + params.toString() : "/";
    router.push(newUrl, { scroll: false });
  }, [searchParams, router, setActiveEditionDate]);

  const {
    filteredArticles,
    sources,
    editions,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    loadMore,
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

      {/* Edition Tabs - zakladki z datami */}
      <div className="lg:px-8 lg:py-2 lg:border-b lg:border-border/50 lg:bg-card/95 lg:backdrop-blur-sm lg:sticky lg:top-[73px] lg:z-30">
        <EditionTabs
          editions={editions}
          activeDate={activeEditionDate}
          onDateChange={handleEditionDateChange}
        />
      </div>

      {/* Source Filter with desktop styling */}
      <div className="lg:px-8 lg:py-3 lg:border-b lg:border-border/50 lg:bg-card/95 lg:backdrop-blur-sm lg:sticky lg:top-[130px] lg:z-30">
        <SourceFilter
          sources={sources}
          activeSourceId={activeSourceFilter}
          onFilterChange={handleSourceFilterChange}
        />
      </div>

      {/* Articles Container */}
      <div className="lg:p-8">
        <ArticleList
          articles={filteredArticles}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          totalCount={totalCount}
          onLoadMore={loadMore}
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

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-muted">Ładowanie...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
