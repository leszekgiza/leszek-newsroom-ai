"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PrivateSource {
  id: string;
  name: string;
  url: string;
  type: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  articleCount: number;
  createdAt: string;
}

interface CatalogSource {
  id: string;
  name: string;
  url: string;
  description: string | null;
  category: string | null;
  articleCount: number;
  isSubscribed: boolean;
  isHidden: boolean;
}

export default function SourcesSettingsPage() {
  const [privateSources, setPrivateSources] = useState<PrivateSource[]>([]);
  const [catalogSources, setCatalogSources] = useState<CatalogSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding new source
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [privateRes, catalogRes] = await Promise.all([
        fetch("/api/sources/private"),
        fetch("/api/sources/catalog"),
      ]);

      if (!privateRes.ok || !catalogRes.ok) {
        throw new Error("Błąd pobierania źródeł");
      }

      const privateData = await privateRes.json();
      const catalogData = await catalogRes.json();

      setPrivateSources(privateData.sources || []);
      setCatalogSources(catalogData.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    setIsAdding(true);
    setAddError(null);

    try {
      const response = await fetch("/api/sources/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSourceName.trim(),
          url: newSourceUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd dodawania źródła");
      }

      // Add to list and reset form
      setPrivateSources((prev) => [
        { ...data.source, articleCount: 0, lastScrapedAt: null },
        ...prev,
      ]);
      setNewSourceName("");
      setNewSourceUrl("");
      setShowAddForm(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsAdding(false);
    }
  };

  const handleTogglePrivateSource = async (sourceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/sources/private/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) throw new Error("Błąd");

      setPrivateSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, isActive: !isActive } : s))
      );
    } catch (err) {
      console.error("Toggle source error:", err);
    }
  };

  const handleDeletePrivateSource = async (sourceId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to źródło? Artykuły z tego źródła również zostaną usunięte.")) {
      return;
    }

    try {
      const response = await fetch(`/api/sources/private/${sourceId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Błąd");

      setPrivateSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (err) {
      console.error("Delete source error:", err);
    }
  };

  const handleToggleCatalogSubscription = async (sourceId: string, isSubscribed: boolean) => {
    try {
      const response = await fetch("/api/sources/catalog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, subscribe: !isSubscribed }),
      });

      if (!response.ok) throw new Error("Błąd");

      setCatalogSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, isSubscribed: !isSubscribed } : s))
      );
    } catch (err) {
      console.error("Toggle subscription error:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-card pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <a href="/settings" className="text-primary">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </a>
          <h1 className="text-xl font-bold text-primary">Źródła</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-highlight">{error}</p>
            <Button onClick={fetchSources} variant="secondary" className="mt-4">
              Spróbuj ponownie
            </Button>
          </div>
        ) : (
          <>
            {/* Private Sources Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary">Moje źródła</h2>
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant={showAddForm ? "secondary" : "primary"}
                >
                  {showAddForm ? "Anuluj" : "+ Dodaj źródło"}
                </Button>
              </div>

              {/* Add Source Form */}
              {showAddForm && (
                <form onSubmit={handleAddSource} className="mb-4 p-4 bg-surface rounded-xl space-y-3">
                  <Input
                    label="Nazwa źródła"
                    placeholder="np. Mój ulubiony blog"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    required
                  />
                  <Input
                    label="URL strony"
                    type="url"
                    placeholder="https://example.com/blog"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    required
                  />
                  {addError && <p className="text-sm text-highlight">{addError}</p>}
                  <Button type="submit" isLoading={isAdding} className="w-full">
                    Dodaj źródło
                  </Button>
                </form>
              )}

              {/* Private Sources List */}
              {privateSources.length === 0 ? (
                <p className="text-muted text-center py-6 bg-surface rounded-xl">
                  Nie masz jeszcze własnych źródeł. Kliknij &quot;Dodaj źródło&quot; aby dodać pierwsze.
                </p>
              ) : (
                <div className="space-y-2">
                  {privateSources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-4 bg-surface rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-primary truncate">{source.name}</p>
                          {!source.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-border rounded-full text-muted">
                              Wyłączone
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted truncate">{source.url}</p>
                        <p className="text-xs text-muted mt-1">
                          {source.articleCount} artykułów
                          {source.lastScrapedAt && (
                            <> · Ostatni scraping: {new Date(source.lastScrapedAt).toLocaleDateString("pl-PL")}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {/* Toggle Active */}
                        <button
                          onClick={() => handleTogglePrivateSource(source.id, source.isActive)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            source.isActive ? "bg-accent" : "bg-border"
                          }`}
                          title={source.isActive ? "Wyłącz" : "Włącz"}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              source.isActive ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeletePrivateSource(source.id)}
                          className="p-2 text-muted hover:text-highlight transition-colors"
                          title="Usuń"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Catalog Sources Section */}
            <section>
              <h2 className="text-lg font-semibold text-primary mb-4">Katalog źródeł</h2>
              <p className="text-sm text-muted mb-4">
                Subskrybuj źródła z katalogu. Artykuły ze subskrybowanych źródeł pojawią się w Twoim feedzie.
              </p>

              {catalogSources.length === 0 ? (
                <p className="text-muted text-center py-6 bg-surface rounded-xl">
                  Brak źródeł w katalogu.
                </p>
              ) : (
                <div className="space-y-2">
                  {catalogSources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-4 bg-surface rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-primary truncate">{source.name}</p>
                          {source.category && (
                            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                              {source.category}
                            </span>
                          )}
                        </div>
                        {source.description && (
                          <p className="text-sm text-muted line-clamp-1">{source.description}</p>
                        )}
                        <p className="text-xs text-muted mt-1">
                          {source.articleCount} artykułów
                        </p>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => handleToggleCatalogSubscription(source.id, source.isSubscribed)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            source.isSubscribed
                              ? "bg-accent text-white"
                              : "bg-border text-primary hover:bg-border/80"
                          }`}
                        >
                          {source.isSubscribed ? "Subskrybujesz" : "Subskrybuj"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
