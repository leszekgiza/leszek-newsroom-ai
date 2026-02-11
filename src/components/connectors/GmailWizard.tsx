"use client";

import { useState, useCallback } from "react";
import { GmailSenderPreview } from "./GmailSenderPreview";
import { GmailSenderList, type SenderItem } from "./GmailSenderList";

type TabName = "paste" | "search" | "browse";

interface AddedSender {
  email: string;
  name: string;
  source: TabName;
}

export function GmailWizard() {
  const [activeTab, setActiveTab] = useState<TabName>("paste");

  // Tab 1: Paste
  const [pasteEmail, setPasteEmail] = useState("");
  const [pasteSearching, setPasteSearching] = useState(false);
  const [pasteResult, setPasteResult] = useState<SenderItem | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Tab 2: Search (LLM)
  const [searchIntent, setSearchIntent] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [searchSenders, setSearchSenders] = useState<SenderItem[]>([]);
  const [searchSelected, setSearchSelected] = useState<Set<string>>(new Set());

  // Tab 3: Browse
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseSenders, setBrowseSenders] = useState<SenderItem[]>([]);
  const [browseSelected, setBrowseSelected] = useState<Set<string>>(new Set());
  const [browseFilter, setBrowseFilter] = useState<string | null>("newsletter");
  const [browseLoaded, setBrowseLoaded] = useState(false);

  // Footer: collected senders
  const [addedSenders, setAddedSenders] = useState<AddedSender[]>([]);
  const [saving, setSaving] = useState(false);

  // === Tab 1: Paste & Match ===
  const handlePasteSearch = async () => {
    if (!pasteEmail.trim()) return;
    setPasteSearching(true);
    setPasteError(null);
    setPasteResult(null);

    try {
      const res = await fetch("/api/connectors/gmail/search-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pasteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPasteResult({
        email: data.sender.email,
        name: data.sender.name,
        messageCount: data.sender.messageCount,
        lastSubject: data.sender.lastSubject,
        frequency: data.sender.frequency,
      });
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : "Wyszukiwanie nie powiodło się");
    } finally {
      setPasteSearching(false);
    }
  };

  const handleAddFromPaste = () => {
    if (!pasteResult) return;
    addSender({ email: pasteResult.email, name: pasteResult.name, source: "paste" });
    setPasteResult(null);
    setPasteEmail("");
  };

  const handleAddManual = () => {
    if (!pasteEmail.trim()) return;
    addSender({ email: pasteEmail.trim(), name: pasteEmail.trim(), source: "paste" });
    setPasteEmail("");
  };

  // === Tab 2: LLM Search ===
  const handleLLMSearch = async () => {
    if (!searchIntent.trim()) return;
    setSearchLoading(true);
    setSearchQuery(null);
    setSearchSenders([]);
    setSearchSelected(new Set());

    try {
      const res = await fetch("/api/connectors/gmail/llm-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: searchIntent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchQuery(data.gmailQuery);
      setSearchSenders(data.senders);
    } catch {
      // handled by empty state
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchToggle = (email: string) => {
    setSearchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleSearchSelectAll = () => {
    setSearchSelected(new Set(searchSenders.map((s) => s.email)));
  };

  // === Tab 3: Browse ===
  const handleLoadBrowse = useCallback(async () => {
    if (browseLoaded) return;
    setBrowseLoading(true);

    try {
      const res = await fetch("/api/connectors/gmail/browse");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBrowseSenders(data.senders);
      setBrowseLoaded(true);
    } catch {
      // handled by empty state
    } finally {
      setBrowseLoading(false);
    }
  }, [browseLoaded]);

  const handleBrowseToggle = (email: string) => {
    setBrowseSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleTabSwitch = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === "browse") {
      handleLoadBrowse();
    }
  };

  const filteredBrowseSenders =
    browseFilter === null
      ? browseSenders
      : browseSenders.filter((s) => s.category === browseFilter);

  // === Sender management ===
  const addSender = (sender: AddedSender) => {
    setAddedSenders((prev) => {
      if (prev.some((s) => s.email === sender.email)) return prev;
      return [...prev, sender];
    });
  };

  const removeSender = (email: string) => {
    setAddedSenders((prev) => prev.filter((s) => s.email !== email));
  };

  // Collect selected from search/browse tabs
  const collectSelectedSenders = () => {
    for (const email of searchSelected) {
      const sender = searchSenders.find((s) => s.email === email);
      if (sender) addSender({ email, name: sender.name, source: "search" });
    }
    for (const email of browseSelected) {
      const sender = browseSenders.find((s) => s.email === email);
      if (sender) addSender({ email, name: sender.name, source: "browse" });
    }
  };

  // Save
  const handleSave = async () => {
    collectSelectedSenders();
    setSaving(true);

    try {
      const allSenders = [
        ...addedSenders,
        ...Array.from(searchSelected)
          .filter((e) => !addedSenders.some((a) => a.email === e))
          .map((email) => {
            const s = searchSenders.find((s) => s.email === email);
            return { email, name: s?.name || email, source: "search" as const };
          }),
        ...Array.from(browseSelected)
          .filter((e) => !addedSenders.some((a) => a.email === e))
          .map((email) => {
            const s = browseSenders.find((s) => s.email === email);
            return { email, name: s?.name || email, source: "browse" as const };
          }),
      ];

      // Deduplicate
      const unique = Array.from(
        new Map(allSenders.map((s) => [s.email, s])).values()
      );

      const res = await fetch("/api/connectors/gmail/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senders: unique.map((s) => ({ email: s.email, name: s.name })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // Redirect back to integrations
      window.location.href = "/settings/integrations";
    } catch {
      // Keep on page
    } finally {
      setSaving(false);
    }
  };

  const totalSelected =
    addedSenders.length + searchSelected.size + browseSelected.size;

  return (
    <div className="space-y-4">
      {/* Gmail Icon & Status */}
      <div className="flex items-center gap-4 py-3">
        <div className="w-14 h-14 bg-white dark:bg-white/95 border border-gray-200 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
          <svg className="w-8 h-8" viewBox="52 42 88 66" fill="none">
            <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
            <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
            <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
            <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
            <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Połączono
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Konta Gmail
          </p>
        </div>
      </div>

      {/* Wizard Tabs */}
      <div className="flex border-b border-border">
        {(
          [
            ["paste", "Wklej nadawcę"],
            ["search", "Wyszukaj"],
            ["browse", "Przeglądaj"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`flex-1 py-3 text-sm text-center transition-colors ${
              activeTab === tab
                ? "border-b-2 border-foreground text-foreground font-semibold"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Paste */}
      {activeTab === "paste" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wpisz adres email nadawcy newslettera, którego chcesz importować.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <input
                type="email"
                placeholder="np. newsletter@deeplearning.ai"
                value={pasteEmail}
                onChange={(e) => setPasteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasteSearch()}
                className="w-full pl-11 pr-4 py-3 bg-muted/10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              onClick={handlePasteSearch}
              disabled={pasteSearching || !pasteEmail.trim()}
              className="px-5 py-3 bg-foreground text-background font-medium rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-50"
            >
              {pasteSearching ? "..." : "Szukaj"}
            </button>
          </div>

          {pasteError && (
            <p className="text-sm text-red-500">{pasteError}</p>
          )}

          {pasteResult && (
            <GmailSenderPreview
              name={pasteResult.name}
              email={pasteResult.email}
              lastSubject={pasteResult.lastSubject}
              frequency={
                pasteResult.frequency === "daily"
                  ? "codziennie"
                  : pasteResult.frequency === "weekly"
                    ? "co tydzień"
                    : "okazjonalnie"
              }
              messageCount={pasteResult.messageCount}
              onAdd={handleAddFromPaste}
            />
          )}

          <button
            onClick={handleAddManual}
            disabled={!pasteEmail.trim()}
            className="w-full py-2.5 text-sm text-muted-foreground border border-dashed border-border rounded-xl hover:bg-muted/10 hover:text-foreground transition-colors disabled:opacity-50"
          >
            + Dodaj ręcznie adres nadawcy (bez wyszukiwania)
          </button>
        </div>
      )}

      {/* Tab 2: Search (LLM) */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Opisz jakie maile chcesz importować. AI przeszuka Twoją skrzynkę i
            znajdzie pasujących nadawców.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="np. cotygodniowe newslettery o AI"
                value={searchIntent}
                onChange={(e) => setSearchIntent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLLMSearch()}
                className="w-full pl-11 pr-4 py-3 bg-muted/10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              onClick={handleLLMSearch}
              disabled={searchLoading || !searchIntent.trim()}
              className="px-5 py-3 bg-foreground text-background font-medium rounded-xl hover:opacity-90 transition-all text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {searchLoading ? "..." : "Szukaj"}
            </button>
          </div>

          {searchQuery && (
            <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2">
              <svg
                className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <p className="text-xs text-primary">
                <span className="font-medium">AI query:</span>{" "}
                <code className="bg-primary/10 px-1 rounded">{searchQuery}</code>
              </p>
            </div>
          )}

          {searchLoading && (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                AI przeszukuje skrzynkę...
              </span>
            </div>
          )}

          {!searchLoading && searchSenders.length > 0 && (
            <GmailSenderList
              senders={searchSenders}
              selected={searchSelected}
              onToggle={handleSearchToggle}
              onSelectAll={handleSearchSelectAll}
            />
          )}
        </div>
      )}

      {/* Tab 3: Browse */}
      {activeTab === "browse" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Przeglądaj nadawców z ostatnich 30 dni. AI sklasyfikowało ich
            automatycznie.
          </p>

          <div className="flex gap-2">
            {[
              { key: "newsletter", label: "Newsletter" },
              { key: "marketing", label: "Marketing" },
              { key: null, label: "Wszystkie" },
            ].map((filter) => (
              <button
                key={filter.key ?? "all"}
                onClick={() => setBrowseFilter(filter.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  browseFilter === filter.key
                    ? "bg-foreground text-background"
                    : "bg-muted/10 text-muted-foreground border border-border hover:bg-muted/20"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {browseLoading && (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                Skanowanie skrzynki...
              </span>
            </div>
          )}

          {!browseLoading && browseSenders.length > 0 && (
            <GmailSenderList
              senders={filteredBrowseSenders}
              selected={browseSelected}
              onToggle={handleBrowseToggle}
              showCategory
            />
          )}
        </div>
      )}

      {/* Footer: Added senders */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Dodane źródła ({addedSenders.length})
          </h3>
        </div>

        {addedSenders.map((sender) => (
          <div
            key={sender.email}
            className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
              {sender.name
                .split(/[\s@.]/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0].toUpperCase())
                .join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">
                {sender.name}
              </p>
              <p className="text-xs text-primary truncate">{sender.email}</p>
            </div>
            <button
              onClick={() => removeSender(sender.email)}
              className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}

        {addedSenders.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Wybierz nadawców z zakładek powyżej
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <a
          href="/settings/integrations"
          className="flex-1 py-3.5 bg-muted/10 text-foreground border border-border font-medium rounded-xl hover:bg-muted/20 transition-colors text-center"
        >
          Anuluj
        </a>
        <button
          onClick={handleSave}
          disabled={saving || totalSelected === 0}
          className="flex-1 py-3.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : `Zapisz (${totalSelected})`}
        </button>
      </div>

      {/* Security Note */}
      <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2.5">
        <svg
          className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <p className="text-xs text-primary">
          <span className="font-medium">OAuth (tylko odczyt).</span> Nie
          przechowujemy hasła. Możesz odłączyć Gmail w każdej chwili.
        </p>
      </div>
    </div>
  );
}
