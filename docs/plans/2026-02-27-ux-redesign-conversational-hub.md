# UX Redesign: Conversational Hub (Variant A v2)

**Data:** 2026-02-27
**Status:** Zatwierdzony
**Makiety:** `superdesign/design_iterations/ux_redesign_variant_a_v2_desktop.html`, `ux_redesign_variant_a_v2_mobile.html`

---

## Cel

Redesign strony glownej Newsroom AI z tradycyjnego dashboard na "Conversational Hub" — centralny command box jako brama do calej aplikacji. Inspiracja: Genspark AI Workspace 2.0.

## Kluczowe problemy do rozwiazania

1. Uzytkownik otwierajac aplikacje nie wie co robic
2. Dodawanie zrodel wymaga wklikiwania sie w ustawienia
3. Duzo niewykorzystanej przestrzeni na desktopie
4. Ikony integracji (Gmail/LinkedIn) w sidebarze nic nie robia
5. Przycisk "Pobierz wszystko" ukryty gleboko

## Decyzje projektowe

- **Minimalizm** — jasne prowadzenie uzytkownika od pierwszego ekranu
- **Command box** jako universal interface — URL, search, AI Q&A (placeholder), voice (placeholder)
- **Sidebar** — zachowujemy obecna nawigacje, naprawiamy integracje
- **Mobile** — obecny UX jest OK, dodajemy command box (compact) i sync button
- **Scope** — pelny command box z placeholderami "Wkrotce dostepne" dla AI Q&A i mikrofonu

---

## Architektura komponentow

### Nowe komponenty

| Komponent | Lokalizacja | Opis |
|-----------|-------------|------|
| `HeroGreeting` | `src/components/home/HeroGreeting.tsx` | "Dzien dobry, {name}" + stats + przycisk "Pobierz nowe" |
| `CommandBox` | `src/components/home/CommandBox.tsx` | Universal input z routingiem: URL→add source, tekst→search, przyciski akcji |
| `QuickHints` | `src/components/home/QuickHints.tsx` | Klikalne chipy. Desktop: flex-wrap. Mobile: horizontal scroll |

### Modyfikowane komponenty

| Komponent | Zmiana |
|-----------|--------|
| `page.tsx` (home) | Nowy layout: Hero → CommandBox → QuickHints → Tabs → Articles |
| `layout.tsx` (main) | Usunac import DesktopHeader |
| `Sidebar.tsx` | Integracje klikalne (→ wizard), statusy connected/inactive |
| `Navbar.tsx` | Dodac sync button (indigo) obok avatara |

### Usuwane komponenty

| Komponent | Powod |
|-----------|-------|
| `DesktopHeader.tsx` | Zastapiony przez HeroGreeting + CommandBox |
| `SearchBar.tsx` | Zastapiony przez CommandBox (compact mobile) |

### Bez zmian

- `BottomNav` — bez zmian
- `ArticleList`, `ArticleCard` — bez zmian
- `EditionTabs`, `SourceFilter` — bez zmian
- `SummaryModal` — bez zmian
- Struktura routingu (/editions, /saved, /trash, /settings)

---

## CommandBox — logika routingu

```
Input zawiera URL (http/https) → tryb "Dodaj zrodlo"
  → Otwiera modal dodawania zrodla z pre-filled URL
  → Uzytkownik potwierdza nazwe i zapisuje

Input to tekst bez URL → tryb "Wyszukaj"
  → Ustawia searchQuery w uiStore (istniejacy FTS)
  → Artykuly filtruja sie w real-time

Klikniecie "Zapytaj AI" → toast "Wkrotce dostepne"
  → Przyszlosc: F9.1 Q&A per article

Klikniecie mikrofon → toast "Wkrotce dostepne"
  → Przyszlosc: F10.1 Voice STT

Quick hint klikniecia:
  → "Odsluchaj wydanie" → uruchamia TTS playlist
  → "Co nowego o AI?" → wyszukuje "AI"
  → URL → wkleja URL do inputa
  → "Dodaj newslettery z Gmaila" → redirect /settings/integrations/gmail
```

---

## Layout

### Desktop (lg+)

```
┌─────────┬──────────────────────────────────────┐
│ Sidebar │  HeroGreeting + SyncBtn              │
│ (260px) │  CommandBox (max-w-720px centered)    │
│         │  QuickHints                           │
│  Feed   │  ─────────────────────────────────    │
│  Wydania│  Tabs: Wydanie dnia | Feed | Briefing │
│  Zapisane│ EditionStrip                         │
│  Kosz   │  ArticleCards                         │
│  Zrodla │                                       │
│         │                                       │
│  Gmail ●│                                       │
│  LinkedIn○                                      │
│         │                                       │
│  User   │                                       │
└─────────┴──────────────────────────────────────┘
```

### Mobile (<lg)

```
┌──────────────────────┐
│ Navbar + 🔄 + 👤     │  ← sticky top
├──────────────────────┤
│ Dzien dobry, Leszek  │
│ 14 nowych · Sync 8:30│
├──────────────────────┤
│ [URL, szukaj...] 🎤→ │  ← compact command box
├──────────────────────┤
│ 🎧 Odsluchaj │ 📰 ...│  ← horizontal scroll hints
├──────────────────────┤
│ Wydanie|Feed|Briefing│  ← sticky tabs
├──────────────────────┤
│ Dzis │ 26 lut │ 25...│  ← edition strip
├──────────────────────┤
│ ArticleCards          │
├──────────────────────┤
│ 🏠  🔖  📰  ⚙️      │  ← bottom nav (unchanged)
└──────────────────────┘
```

---

## Poza scope

- Conversational chat UI (Wariant C onboarding)
- TTS player bar (fixed bottom) — osobny sprint
- Zmiana routingu
- Dark mode
- Onboarding wizard
