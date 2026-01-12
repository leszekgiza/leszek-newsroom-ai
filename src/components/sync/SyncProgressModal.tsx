"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, RefreshCw, Check, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface ProgressEvent {
  type: "start" | "source_start" | "article_check" | "article_new" | "article_skip" | "article_error" | "source_done" | "done" | "error";
  sourceId?: string;
  sourceName?: string;
  sourceIndex?: number;
  totalSources?: number;
  articleUrl?: string;
  articleTitle?: string;
  articleIndex?: number;
  totalArticles?: number;
  newCount?: number;
  skipCount?: number;
  errorCount?: number;
  message?: string;
  error?: string;
}

interface LogEntry {
  id: number;
  type: "info" | "success" | "skip" | "error";
  message: string;
  timestamp: Date;
}

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function SyncProgressModal({ isOpen, onClose, onComplete }: SyncProgressModalProps) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [sourceProgress, setSourceProgress] = useState({ current: 0, total: 0 });
  const [articleProgress, setArticleProgress] = useState({ current: 0, total: 0 });
  const [currentArticle, setCurrentArticle] = useState<string | null>(null);
  const [stats, setStats] = useState({ new: 0, skip: 0, error: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logIdRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs(prev => [...prev.slice(-99), { id: logIdRef.current++, type, message, timestamp: new Date() }]);
  }, []);

  const startSync = useCallback(async () => {
    setStatus("running");
    setStats({ new: 0, skip: 0, error: 0 });
    setLogs([]);
    setErrorMessage(null);
    setCurrentSource(null);
    setCurrentArticle(null);
    setSourceProgress({ current: 0, total: 0 });
    setArticleProgress({ current: 0, total: 0 });

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/scrape/all", {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Blad podczas pobierania");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Brak strumienia odpowiedzi");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: ProgressEvent = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        addLog("info", "Pobieranie anulowane");
        setStatus("idle");
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Nieznany blad");
        setStatus("error");
      }
    }
  }, [addLog]);

  const handleEvent = useCallback((event: ProgressEvent) => {
    switch (event.type) {
      case "start":
        setSourceProgress({ current: 0, total: event.totalSources || 0 });
        addLog("info", "Rozpoczynam pobieranie z " + (event.totalSources || 0) + " zrodel");
        break;
      case "source_start":
        setCurrentSource(event.sourceName || null);
        setSourceProgress({ current: event.sourceIndex || 0, total: event.totalSources || 0 });
        setArticleProgress({ current: 0, total: 0 });
        addLog("info", "Zrodlo: " + event.sourceName);
        break;
      case "article_check":
        setCurrentArticle(event.articleTitle || null);
        setArticleProgress({ current: event.articleIndex || 0, total: event.totalArticles || 0 });
        break;
      case "article_new":
        setStats(s => ({ ...s, new: s.new + 1 }));
        addLog("success", "Nowy: " + event.articleTitle);
        break;
      case "article_skip":
        setStats(s => ({ ...s, skip: s.skip + 1 }));
        addLog("skip", "Pominiety: " + event.articleTitle);
        break;
      case "article_error":
        setStats(s => ({ ...s, error: s.error + 1 }));
        addLog("error", "Blad: " + event.articleTitle + " - " + event.error);
        break;
      case "source_done":
        addLog("info", "Zakonczono " + event.sourceName + ": +" + event.newCount + " nowych, " + event.skipCount + " pomini., " + event.errorCount + " bledow");
        break;
      case "done":
        setStatus("done");
        setCurrentSource(null);
        setCurrentArticle(null);
        addLog("success", "Zakonczono! Nowych: " + event.newCount + ", Pomini.: " + event.skipCount + ", Bledow: " + event.errorCount);
        break;
      case "error":
        setErrorMessage(event.error || "Nieznany blad");
        setStatus("error");
        addLog("error", "Blad: " + event.error);
        break;
    }
  }, [addLog]);

  const cancelSync = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (isOpen && status === "idle") {
      startSync();
    }
  }, [isOpen, status, startSync]);

  useEffect(() => {
    if (logsEndRef.current && logsExpanded) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, logsExpanded]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleClose = () => {
    if (status === "running") {
      cancelSync();
    }
    if (status === "done" && onComplete) {
      onComplete();
    }
    setStatus("idle");
    onClose();
  };

  if (!isOpen) return null;

  const sourcePercent = sourceProgress.total > 0 ? (sourceProgress.current / sourceProgress.total) * 100 : 0;
  const articlePercent = articleProgress.total > 0 ? (articleProgress.current / articleProgress.total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-primary">Pobieranie artykulow</h2>
          <button onClick={handleClose} className="p-2 hover:bg-muted/20 rounded-full">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-auto">
          {status === "error" && (
            <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Blad</p>
                <p className="text-sm text-destructive/80">{errorMessage}</p>
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="p-3 bg-accent/10 rounded-lg flex items-start gap-3">
              <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-accent">Zakonczono</p>
                <p className="text-sm text-muted">Pobrano {stats.new} nowych artykulow</p>
              </div>
            </div>
          )}

          {(status === "running" || status === "done") && (
            <>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">Zrodla</span>
                  <span className="text-primary">{sourceProgress.current}/{sourceProgress.total}</span>
                </div>
                <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-300" style={{ width: sourcePercent + "%" }} />
                </div>
                {currentSource && status === "running" && (
                  <p className="text-xs text-muted mt-1 truncate">{currentSource}</p>
                )}
              </div>

              {articleProgress.total > 0 && status === "running" && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted">Artykuly</span>
                    <span className="text-primary">{articleProgress.current}/{articleProgress.total}</span>
                  </div>
                  <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: articlePercent + "%" }} />
                  </div>
                  {currentArticle && (
                    <p className="text-xs text-muted mt-1 truncate">{currentArticle}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-accent/10 rounded-lg text-center">
                  <p className="text-xl font-bold text-accent">{stats.new}</p>
                  <p className="text-xs text-muted">Nowe</p>
                </div>
                <div className="p-3 bg-muted/10 rounded-lg text-center">
                  <p className="text-xl font-bold text-muted">{stats.skip}</p>
                  <p className="text-xs text-muted">Pominiete</p>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <p className="text-xl font-bold text-destructive">{stats.error}</p>
                  <p className="text-xs text-muted">Bledy</p>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setLogsExpanded(!logsExpanded)}
                  className="flex items-center gap-2 text-sm text-muted hover:text-primary w-full"
                >
                  {logsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Logi ({logs.length})
                </button>
                {logsExpanded && (
                  <div className="mt-2 max-h-48 overflow-auto bg-muted/5 rounded-lg p-2 text-xs font-mono space-y-1">
                    {logs.map(log => (
                      <div key={log.id} className={
                        log.type === "success" ? "text-accent" :
                        log.type === "error" ? "text-destructive" :
                        log.type === "skip" ? "text-muted" : "text-primary"
                      }>
                        {log.message}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          {status === "running" && (
            <button
              onClick={cancelSync}
              className="flex-1 py-3 px-4 bg-muted/20 text-primary rounded-xl font-medium hover:bg-muted/30"
            >
              Anuluj
            </button>
          )}
          {status === "error" && (
            <button
              onClick={startSync}
              className="flex-1 py-3 px-4 bg-accent text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sprobuj ponownie
            </button>
          )}
          {status === "done" && (
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 bg-accent text-white rounded-xl font-medium"
            >
              Zamknij
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
