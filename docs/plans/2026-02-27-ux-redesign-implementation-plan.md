# UX Redesign: Conversational Hub — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign strony glownej z dashboard na Conversational Hub z centralnym command boxem, sync buttonem i ulepszonym mobile layout.

**Architecture:** Trzy nowe komponenty (HeroGreeting, CommandBox, QuickHints) zastepuja DesktopHeader i SearchBar. CommandBox routuje input: URL→add source, tekst→FTS search, placeholdery dla AI Q&A i Voice. Sonner jako toast library.

**Tech Stack:** Next.js 14 (App Router), React 18, Zustand 5, Tailwind CSS, sonner (nowy)

**Design doc:** `docs/plans/2026-02-27-ux-redesign-conversational-hub.md`
**Makiety:** `superdesign/design_iterations/ux_redesign_variant_a_v2_desktop.html`, `ux_redesign_variant_a_v2_mobile.html`

---

### Task 1: Install sonner toast library

**Files:**
- Modify: `package.json`
- Modify: `src/app/layout.tsx` (root layout — add Toaster provider)

**Step 1: Install sonner**

Run: `npm install sonner`

**Step 2: Add Toaster to root layout**

In `src/app/layout.tsx`, add import and component:

```tsx
import { Toaster } from "sonner";
```

Add `<Toaster position="top-center" richColors />` inside `<body>` after `{children}`.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx
git commit -m "chore: add sonner toast library"
```

---

### Task 2: Create HeroGreeting component

**Files:**
- Create: `src/components/home/HeroGreeting.tsx`

**Context:**
- Uses `useAuthStore` to get user name (pattern: see `Sidebar.tsx` line 88)
- Shows greeting based on time of day (rano/dzien/wieczor)
- Shows article stats (prop: `newCount: number`)
- Shows last sync time (prop: `lastSyncAt: string | null`)
- "Pobierz nowe" button triggers sync (prop: `onSync`, `isSyncing`)
- Desktop: flex row (greeting left, sync btn right), max-w-720px centered
- Mobile: greeting + stats, sync btn is in Navbar (Task 5)

**Step 1: Create component**

```tsx
"use client";

import { useAuthStore } from "@/stores/authStore";

interface HeroGreetingProps {
  newCount: number;
  lastSyncAt: string | null;
  onSync: () => void;
  isSyncing: boolean;
}

export function HeroGreeting({ newCount, lastSyncAt, onSync, isSyncing }: HeroGreetingProps) {
  const { user } = useAuthStore();
  const name = user?.name?.split(" ")[0] || "tam";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Dzien dobry" : hour < 18 ? "Czesc" : "Dobry wieczor";

  const syncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="px-4 pt-6 pb-2 lg:px-0">
      {/* Desktop: row with sync button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-semibold text-primary">
          {greeting}, {name}
        </h1>
        {/* Sync button — desktop only, mobile has it in Navbar */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-60 transition-all"
        >
          <svg
            className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isSyncing ? "Pobieram..." : "Pobierz nowe"}
        </button>
      </div>
      <p className="text-sm text-muted mt-1">
        {newCount > 0 ? (
          <>Masz <strong className="text-accent">{newCount} nowych</strong> artykulow</>
        ) : (
          <>Brak nowych artykulow</>
        )}
        {syncTime && <> · Sync: {syncTime}</>}
      </p>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/home/HeroGreeting.tsx
git commit -m "feat: add HeroGreeting component for home page"
```

---

### Task 3: Create CommandBox component

**Files:**
- Create: `src/components/home/CommandBox.tsx`

**Context:**
- Input field that detects URLs vs text
- On submit: URL → opens add-source flow, text → sets searchQuery in uiStore
- Action buttons: "Dodaj URL", "Szukaj", "Zapytaj AI" (toast), microphone (toast)
- Desktop: full version with labeled buttons below input
- Mobile: compact — input + mic icon + send button only
- Uses `useUIStore` for `setSearchQuery`
- Uses `useRouter` for navigation to add-source
- Uses `toast` from sonner for placeholder features

**Step 1: Create component**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { toast } from "sonner";

interface CommandBoxProps {
  onAddSource?: (url: string) => void;
}

export function CommandBox({ onAddSource }: CommandBoxProps) {
  const [input, setInput] = useState("");
  const { setSearchQuery } = useUIStore();
  const router = useRouter();

  const isUrl = useCallback((text: string) => {
    const trimmed = text.trim();
    return trimmed.startsWith("http://") || trimmed.startsWith("https://") || /^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isUrl(trimmed)) {
      const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      if (onAddSource) {
        onAddSource(url);
      } else {
        router.push(`/settings/sources?addUrl=${encodeURIComponent(url)}`);
      }
      setInput("");
    } else {
      setSearchQuery(trimmed);
      setInput("");
    }
  }, [input, isUrl, onAddSource, router, setSearchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 py-2 lg:px-0">
      <div className="bg-card border border-border rounded-2xl p-3 lg:p-4 shadow-sm focus-within:border-accent focus-within:shadow-md transition-all">
        {/* Input row */}
        <div className="flex items-center gap-2 lg:gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
            className="flex-1 bg-transparent text-primary text-sm lg:text-base outline-none placeholder:text-muted/60"
          />
          {/* Mobile: mic + send only */}
          <button
            onClick={() => toast.info("Wkrotce dostepne", { description: "Wejscie glosowe bedzie dostepne w przyszlej wersji" })}
            className="lg:hidden w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button
            onClick={handleSubmit}
            className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Desktop: action buttons row */}
        <div className="hidden lg:flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <button
            onClick={() => { if (input.trim()) handleSubmit(); else toast.info("Wklej URL w pole powyzej"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:bg-accent/5 hover:border-accent/30 hover:text-accent transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Dodaj URL
          </button>
          <button
            onClick={() => { if (input.trim()) { setSearchQuery(input.trim()); setInput(""); } }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:bg-accent/5 hover:border-accent/30 hover:text-accent transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Szukaj
          </button>
          <button
            onClick={() => toast.info("Wkrotce dostepne", { description: "Rozmowa z artykulami bedzie dostepna w przyszlej wersji" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:bg-accent/5 hover:border-accent/30 hover:text-accent transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Zapytaj AI
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => toast.info("Wkrotce dostepne", { description: "Wejscie glosowe bedzie dostepne w przyszlej wersji" })}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted hover:text-accent hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/home/CommandBox.tsx
git commit -m "feat: add CommandBox component with URL detection and search routing"
```

---

### Task 4: Create QuickHints component

**Files:**
- Create: `src/components/home/QuickHints.tsx`

**Context:**
- Clickable chip suggestions below CommandBox
- Desktop: flex-wrap centered
- Mobile: horizontal scroll (overflow-x-auto, no scrollbar)
- Each hint has an icon + label + action (callback prop)
- Actions: fill input, search, navigate, trigger TTS

**Step 1: Create component**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";

interface QuickHintsProps {
  onFillInput?: (text: string) => void;
}

const hints = [
  { icon: "🎧", label: "Odsluchaj wydanie", action: "tts" as const },
  { icon: "📰", label: "Co nowego?", action: "search" as const, value: "" },
  { icon: "🔗", label: "Dodaj zrodlo", action: "fill" as const, value: "https://" },
  { icon: "📧", label: "Podlacz Gmail", action: "navigate" as const, value: "/settings/integrations/gmail" },
];

export function QuickHints({ onFillInput }: QuickHintsProps) {
  const router = useRouter();
  const { setActiveEditionDate } = useUIStore();

  const handleClick = (hint: typeof hints[number]) => {
    switch (hint.action) {
      case "fill":
        onFillInput?.(hint.value || "");
        break;
      case "search":
        setActiveEditionDate(null);
        break;
      case "navigate":
        router.push(hint.value || "/");
        break;
      case "tts":
        // Set today's edition as active — TTS playlist is on the edition page
        const today = new Date().toISOString().slice(0, 10);
        setActiveEditionDate(today);
        break;
    }
  };

  return (
    <div className="px-4 py-2 lg:px-0">
      <div className="flex gap-2 overflow-x-auto lg:flex-wrap lg:justify-center scrollbar-none pb-1">
        {hints.map((hint) => (
          <button
            key={hint.label}
            onClick={() => handleClick(hint)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted whitespace-nowrap hover:border-accent/30 hover:text-accent hover:bg-accent/5 transition-colors flex-shrink-0"
          >
            <span>{hint.icon}</span>
            {hint.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/home/QuickHints.tsx
git commit -m "feat: add QuickHints component with clickable suggestion chips"
```

---

### Task 5: Update Navbar — add sync button for mobile

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

**Context:**
- Add sync button (indigo circle with refresh icon) next to user avatar
- Sync button triggers same SSE flow as SyncProgressModal
- New props or state needed: `onSync` callback + `isSyncing` state
- Since Navbar is in layout.tsx (server boundary), we need to lift sync state. Simplest: Navbar gets props via context or we add a small sync store.
- Approach: Add `showSyncModal` state to uiStore, Navbar button sets it to true, page.tsx includes SyncProgressModal.

**Step 1: Add sync modal state to uiStore**

In `src/stores/uiStore.ts`, add:
- `showSyncModal: boolean` (default false)
- `setShowSyncModal: (show: boolean) => void`

**Step 2: Modify Navbar.tsx**

Add sync button between logo and user menu:

```tsx
import { useUIStore } from "@/stores/uiStore";

// Inside component:
const { showSyncModal, setShowSyncModal } = useUIStore();

// In JSX, before the user avatar button:
<button
  onClick={() => setShowSyncModal(true)}
  className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
  title="Pobierz nowe"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
</button>
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/stores/uiStore.ts src/components/layout/Navbar.tsx
git commit -m "feat: add sync button to mobile navbar"
```

---

### Task 6: Update Sidebar — clickable integrations

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Context:**
- Gmail and LinkedIn buttons currently do nothing
- Change them to `<Link>` elements pointing to their wizard pages
- Gmail → `/settings/integrations/gmail`
- LinkedIn → `/settings/integrations/linkedin`
- Keep existing SVG icons and styling

**Step 1: Replace integration buttons with Links**

Change the two `<button>` elements in the Integracje section to `<Link>` elements:
- Gmail: `href="/settings/integrations/gmail"`
- LinkedIn: `href="/settings/integrations/linkedin"`

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "fix: make sidebar integration buttons clickable (link to wizards)"
```

---

### Task 7: Rewrite home page.tsx with new layout

**Files:**
- Modify: `src/app/(main)/page.tsx`

**Context:**
- Remove DesktopHeader and SearchBar imports/usage
- Add HeroGreeting, CommandBox, QuickHints
- Add SyncProgressModal (moved from settings/sources)
- Hero section with gradient background (like mockup)
- Desktop: max-w-720px centered for Hero+CommandBox+Hints
- Keep existing: EditionTabs, SourceFilter, ArticleList, SummaryModal
- Sync triggered via uiStore showSyncModal or local state

**Step 1: Rewrite page.tsx**

Replace entire HomePageContent with new layout:
1. Remove imports: `DesktopHeader`, `SearchBar`
2. Add imports: `HeroGreeting`, `CommandBox`, `QuickHints`, `SyncProgressModal`
3. Add sync state (local `isSyncing`, `showSyncModal` from uiStore)
4. New JSX order:
   - `<section className="hero bg-gradient...">` with max-w-720px centering
     - HeroGreeting
     - CommandBox
     - QuickHints
   - `</section>`
   - EditionTabs (existing)
   - SourceFilter (existing)
   - ArticleList (existing)
   - SummaryModal (existing)
   - SyncProgressModal (conditional on showSyncModal)

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/(main)/page.tsx
git commit -m "feat: redesign home page with Conversational Hub layout"
```

---

### Task 8: Remove deprecated components

**Files:**
- Delete: `src/components/layout/DesktopHeader.tsx`
- Delete: `src/components/layout/SearchBar.tsx`
- Modify: `src/app/(main)/layout.tsx` (if it imports DesktopHeader)

**Step 1: Check for remaining imports**

Run: `grep -r "DesktopHeader\|SearchBar" src/ --include="*.tsx" --include="*.ts" -l`

Remove any remaining imports of these components.

**Step 2: Delete files**

```bash
rm src/components/layout/DesktopHeader.tsx
rm src/components/layout/SearchBar.tsx
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove DesktopHeader and SearchBar (replaced by CommandBox)"
```

---

### Task 9: Final verification

**Step 1: Full build check**

Run: `npm run build`

**Step 2: Lint check**

Run: `npm run lint`

**Step 3: Manual test checklist**

- [ ] Desktop: Hero greeting shows user name
- [ ] Desktop: Command box visible, accepts URL and text
- [ ] Desktop: "Pobierz nowe" button visible and triggers sync modal
- [ ] Desktop: Quick hints visible, clickable
- [ ] Desktop: Sidebar integrations link to wizards
- [ ] Desktop: Tabs, edition strip, articles render correctly
- [ ] Mobile: Sync button in navbar
- [ ] Mobile: Compact command box (input + mic + send)
- [ ] Mobile: Quick hints horizontal scroll
- [ ] Mobile: Tabs sticky below greeting area
- [ ] Mobile: Bottom nav unchanged
- [ ] "Zapytaj AI" shows toast "Wkrotce dostepne"
- [ ] Microphone shows toast "Wkrotce dostepne"
- [ ] Typing URL and pressing Enter navigates to add-source
- [ ] Typing text and pressing Enter triggers search

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues from manual testing"
```
