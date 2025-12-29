# Changelog

## [2.2.0] - 2025-12-29 (AI Summaries)

### Added
- **AI Summary Generation** - Claude API generates detailed summaries with facts and insights
- **Auto-regenerate** - summaries are automatically generated when too short (<100 words)
- **Regenerate button** - "Wygeneruj ponownie" allows manual regeneration
- **New user** - leszek.giza@gmail.com account in seed data

### Changed
- Summary length increased to 1-2 minutes TTS (~200-300 words)
- Summaries now include specific facts, examples, and practical insights

### Technical
- New API endpoint: `POST /api/articles/[id]/summarize`
- Added `@anthropic-ai/sdk` dependency
- Updated `SummaryModal.tsx` with generation UI and loading states

---

## [2.1.1] - 2025-12-29 (Bug Fixes)

### Fixed
- **TTS playback** - replaced `edge-tts` with `edge-tts-universal` to fix 403 error from Microsoft's Edge TTS service
- **Source link** - added `noopener,noreferrer` to external link window.open()
- **Sources nav link** - fixed sidebar link from `/sources` to `/settings/sources`

### Changed
- Updated TTS API route (`src/app/api/tts/route.ts`) to use new `edge-tts-universal` package

---

## [2.1.0] - 2025-12-29 (Responsive Layout)

### Added - Responsive Desktop Layout
- **Sidebar** (`Sidebar.tsx`) - nawigacja, integracje (Gmail/LinkedIn), profil uzytkownika
- **DesktopHeader** (`DesktopHeader.tsx`) - wyszukiwarka, przycisk "Dodaj zrodlo"
- **Grid layout** dla artykulow - 2 kolumny (lg:), 3 kolumny (xl:)
- **TTS button** (fioletowy) na kartach artykulow
- **Badge NEW** dla nieprzeczytanych artykulow

### Added - Playwright Testing
- Konfiguracja Playwright (`playwright.config.ts`)
- Testy e2e dla logowania (`e2e/auth/login.spec.ts`)
- Testy e2e dla rejestracji (`e2e/auth/register.spec.ts`)
- Visual regression tests z baseline screenshots
- MCP integration (`.mcp.json`)

### Fixed - Tailwind 4 CSS
- Naprawiono cykliczne referencje CSS w `@theme` (`--spacing-md: var(--spacing-md)`)
- Usunieto konflikt z domyslna skala spacing Tailwind
- `max-w-md` teraz poprawnie daje 448px zamiast 16px

### Changed - ArticleCard
- Redesign karty dla desktop z bookmark button w prawym gornym rogu
- Przycisk "Zrodlo" widoczny tylko na desktop
- Responsywne przyciski akcji (mobile vs desktop layout)

### Breakpoints
- `lg:` (1024px+) - Sidebar + grid 2-3 kolumn
- `md:` (768px) - Mobile navbar, single column
- Mobile - Bottom nav, single column

---

## [2.0.0] - 2025-12-28 (Design Phase)

### Redesign
Kompletny redesign aplikacji - przejście z Reveal.js na Next.js, mobile-first approach.

### Added - Dokumentacja
- `docs/requirements.md` - wymagania funkcjonalne i niefunkcjonalne (v2.0)
- `docs/user-stories.md` - 16+ user stories dla MVP
- `docs/hld.md` - High-Level Design z architekturą systemu
- `README.md` - zaktualizowany opis projektu

### Added - UI Designs (24 pliki)
- 10x UI Light (Mobile) - strona główna, logowanie, rejestracja, zapisane, modal AI, ustawienia, reset hasła, Gmail, LinkedIn, ukryte źródła
- 3x UI Dark (Mobile) - strona główna, logowanie, modal AI
- 3x UI Desktop - strona główna, ustawienia, modal AI
- 8x Wireframes - szkice strukturalne
- `superdesign/gallery.html` - galeria wszystkich designów

### Added - Nowe wymagania
- PostgreSQL Full-Text Search z obsługą języka polskiego
- Wyszukiwanie w tytułach i AI-generowanych streszczeniach
- Integracja Gmail (OAuth, newslettery)
- Integracja LinkedIn (li_at cookie, hashtagi, eksperci)
- Zarządzanie ukrytymi źródłami
- Filtrowanie po źródle z licznikami
- Reset hasła
- Wybór głosu TTS (polski/angielski, męski/żeński)

### Changed - Architektura
- **Frontend:** Reveal.js → Next.js 14+ (App Router)
- **Backend:** Express/Vercel → Next.js API Routes
- **Database:** Supabase → Self-hosted PostgreSQL
- **Deployment:** Vercel → Oracle Cloud Free Tier (Docker)
- **Scraping:** Dodano Crawl4AI (Python, Playwright)

### Technical Decisions
- Modular Monolith architecture
- Prisma ORM
- Zustand for state management
- Tailwind CSS (design tokens)
- Edge TTS (darmowe, polski głos)
- Claude 3.5 Sonnet (streszczenia)

---

## [1.0.0] - 2025-12-26

### Added
- Prezentacja Reveal.js z artykulami z 14 blogow AI/ML
- Panel boczny ze streszczeniami generowanymi przez Claude API
- Text-to-Speech (Edge TTS) dla streszczen i slajdow
- Funkcja "Zapisz na pozniej" z osobna strona /saved
- Integracja z Supabase (PostgreSQL) zamiast lokalnych plikow JSON
- Vercel serverless functions dla API
- Domyslne uruchomienie od slajdu #2

### API Endpoints
- POST /api/summarize - streszczenia artykulow (Claude API)
- POST /api/tts - Text-to-Speech (Edge TTS)
- GET /api/tts/voices - lista dostepnych glosow
- GET /api/articles - historia artykulow
- POST /api/articles/seen - oznaczanie jako przeczytane
- GET/POST /api/saved - zapisane artykuly
- DELETE /api/saved/:url - usuwanie zapisanych
- GET/POST /api/fetch-log - log pobierania

### Technical
- Node.js + Express (lokalny development)
- Vercel serverless (produkcja)
- Supabase PostgreSQL (baza danych)
- Reveal.js (prezentacja)
- Edge TTS (synteza mowy)

### Zrodla artykulow
1. Ethan Mollick - One Useful Thing
2. Benedict Evans
3. Stratechery - Ben Thompson
4. Marginal Revolution
5. Hugging Face Blog
6. Jason Liu - jxnl.co
7. Hamel Husain
8. Phil Schmid
9. Eugene Yan
10. Lilian Weng
11. Machine Learning Mastery
12. Interconnects
13. Sebastian Raschka
14. Chip Huyen

### Deployment
- Production URL: https://leszek-newsroom-ai.vercel.app
- GitHub: https://github.com/leszekgiza/leszek-newsroom-ai
