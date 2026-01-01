"use client";

import { useState, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type WizardStep = "discovery" | "patterns" | "complete";

interface DiscoveredLink {
  url: string;
  title: string;
  path: string;
}

interface ExtractedPattern {
  pattern: string;
  matchCount: number;
  potentialMatches: number;
  sampleUrls: string[];
  depth: number;
}

interface SourceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  onComplete: () => void;
}

export function SourceWizard({
  isOpen,
  onClose,
  sourceId,
  sourceName,
  sourceUrl,
  onComplete,
}: SourceWizardProps) {
  const [step, setStep] = useState<WizardStep>("discovery");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discovery step state
  const [discoveredLinks, setDiscoveredLinks] = useState<DiscoveredLink[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // Patterns step state
  const [patterns, setPatterns] = useState<ExtractedPattern[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(
    new Set()
  );

  // Load discovered links
  const loadDiscoveredLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sources/private/${sourceId}/discover`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd podczas ładowania linków");
      }

      setDiscoveredLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setIsLoading(false);
    }
  }, [sourceId]);

  // Load on open
  useState(() => {
    if (isOpen && discoveredLinks.length === 0) {
      loadDiscoveredLinks();
    }
  });

  // Toggle link selection
  const toggleLinkSelection = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedUrls.size === discoveredLinks.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(discoveredLinks.map((l) => l.url)));
    }
  };

  // Extract patterns from selected URLs
  const extractPatterns = async () => {
    if (selectedUrls.size === 0) {
      setError("Wybierz przynajmniej jeden artykuł");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sources/private/${sourceId}/patterns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedUrls: Array.from(selectedUrls),
            allDiscoveredUrls: discoveredLinks.map((l) => l.url),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd podczas ekstrakcji wzorców");
      }

      setPatterns(data.patterns || []);
      // Auto-select all patterns
      setSelectedPatterns(
        new Set((data.patterns || []).map((p: ExtractedPattern) => p.pattern))
      );
      setStep("patterns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle pattern selection
  const togglePatternSelection = (pattern: string) => {
    setSelectedPatterns((prev) => {
      const next = new Set(prev);
      if (next.has(pattern)) {
        next.delete(pattern);
      } else {
        next.add(pattern);
      }
      return next;
    });
  };

  // Save configuration
  const saveConfig = async () => {
    if (selectedPatterns.size === 0) {
      setError("Wybierz przynajmniej jeden wzorzec");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sources/private/${sourceId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includePatterns: Array.from(selectedPatterns),
          sampleUrls: Array.from(selectedUrls),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd podczas zapisywania konfiguracji");
      }

      setStep("complete");

      // Trigger initial scrape
      await fetch("/api/scrape/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          sourceType: "private",
        }),
      });

      // Notify parent
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    if (step === "patterns") {
      setStep("discovery");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full max-h-[80vh] p-4">
        {/* Title */}
        <h2 className="text-lg font-semibold text-primary mb-4">
          Konfiguracja: {sourceName}
        </h2>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4 px-1">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step === "discovery"
                ? "bg-primary text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}
          >
            1
          </div>
          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded">
            <div
              className={cn(
                "h-full bg-primary rounded transition-all",
                step === "discovery" ? "w-0" : "w-full"
              )}
            />
          </div>
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step === "patterns" || step === "complete"
                ? "bg-primary text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}
          >
            2
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {step === "discovery" && (
            <DiscoveryStep
              links={discoveredLinks}
              selectedUrls={selectedUrls}
              isLoading={isLoading}
              onToggle={toggleLinkSelection}
              onToggleAll={toggleSelectAll}
              onRefresh={loadDiscoveredLinks}
            />
          )}

          {step === "patterns" && (
            <PatternsStep
              patterns={patterns}
              selectedPatterns={selectedPatterns}
              onToggle={togglePatternSelection}
            />
          )}

          {step === "complete" && <CompleteStep />}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
          {step === "discovery" && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-muted hover:text-primary"
              >
                Anuluj
              </button>
              <button
                onClick={extractPatterns}
                disabled={selectedUrls.size === 0 || isLoading}
                className={cn(
                  "px-6 py-2 bg-primary text-white rounded-lg font-medium",
                  "hover:bg-secondary transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? "Analizuję..." : `Dalej (${selectedUrls.size})`}
              </button>
            </>
          )}

          {step === "patterns" && (
            <>
              <button
                onClick={goBack}
                className="px-4 py-2 text-sm text-muted hover:text-primary"
              >
                ← Wstecz
              </button>
              <button
                onClick={saveConfig}
                disabled={selectedPatterns.size === 0 || isLoading}
                className={cn(
                  "px-6 py-2 bg-primary text-white rounded-lg font-medium",
                  "hover:bg-secondary transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? "Zapisuję..." : "Zapisz i pobierz artykuły"}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Discovery Step Component
interface DiscoveryStepProps {
  links: DiscoveredLink[];
  selectedUrls: Set<string>;
  isLoading: boolean;
  onToggle: (url: string) => void;
  onToggleAll: () => void;
  onRefresh: () => void;
}

function DiscoveryStep({
  links,
  selectedUrls,
  isLoading,
  onToggle,
  onToggleAll,
  onRefresh,
}: DiscoveryStepProps) {
  if (isLoading && links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted">Szukam artykułów na stronie...</p>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted mb-4">Nie znaleziono linków</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted">
          Znaleziono {links.length} linków. Zaznacz te, które Cię interesują:
        </p>
        <button
          onClick={onToggleAll}
          className="text-xs text-primary hover:underline"
        >
          {selectedUrls.size === links.length
            ? "Odznacz wszystko"
            : "Zaznacz wszystko"}
        </button>
      </div>

      <div className="space-y-2">
        {links.map((link) => (
          <label
            key={link.url}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
              selectedUrls.has(link.url)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            )}
          >
            <input
              type="checkbox"
              checked={selectedUrls.has(link.url)}
              onChange={() => onToggle(link.url)}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary text-sm leading-snug line-clamp-2">
                {link.title}
              </p>
              <p className="text-xs text-muted mt-1 truncate">{link.path}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// Patterns Step Component
interface PatternsStepProps {
  patterns: ExtractedPattern[];
  selectedPatterns: Set<string>;
  onToggle: (pattern: string) => void;
}

function PatternsStep({
  patterns,
  selectedPatterns,
  onToggle,
}: PatternsStepProps) {
  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted">Nie udało się wykryć wzorców</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Na podstawie Twoich wyborów będziemy pobierać artykuły z tych sekcji:
      </p>

      <div className="space-y-2">
        {patterns.map((pattern) => (
          <label
            key={pattern.pattern}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
              selectedPatterns.has(pattern.pattern)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            )}
          >
            <input
              type="checkbox"
              checked={selectedPatterns.has(pattern.pattern)}
              onChange={() => onToggle(pattern.pattern)}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <p className="font-mono text-sm text-primary">{pattern.pattern}</p>
              <p className="text-xs text-muted mt-0.5">
                Dopasowano: {pattern.potentialMatches} artykułów
              </p>
            </div>
          </label>
        ))}
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <p className="text-xs text-muted">
          💡 Tip: Wzorce to prefiksy URL. Np. <code>/analizy/</code> dopasuje
          wszystkie artykuły zaczynające się od /analizy/
        </p>
      </div>
    </div>
  );
}

// Complete Step Component
function CompleteStep() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-primary mb-2">Gotowe!</h3>
      <p className="text-sm text-muted text-center">
        Konfiguracja zapisana. Pobieram artykuły...
      </p>
    </div>
  );
}
