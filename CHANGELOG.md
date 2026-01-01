# Changelog

## [2.5.1] - 2026-01-01 (Date Display & Sorting)

### Added - Article Dates (F3.8)
- **Date display on every article** - shows relative time (e.g., "3h temu", "2d temu")
- **Fallback to createdAt** - articles without publishedAt show creation date
- **Sorting by publication date** - newest articles first, nulls at bottom

### Technical
- Added `createdAt` to article API responses (`/api/articles`, `/api/saved`, `/api/trash`)
- Updated `ArticleCard` to use `publishedAt || createdAt` for date display
- Prisma orderBy with `nulls: "last"` for proper sorting

---

## [2.5.0] - 2025-12-30 (Article Scraping)

### Added - Scraping with Crawl4AI (F1.1)
- **Python scraper microservice** - FastAPI + Crawl4AI for web scraping
- **Scrape button** - "Pobierz artykuły" button on Sources page
- **Article extraction** - automatically finds article links from blog pages
- **Markdown conversion** - extracts article content as markdown
- **Intro generation** - extracts first 2 sentences as article intro

### Technical - Scraper Architecture
- New `scraper/` directory with Python FastAPI service:
  - `POST /scrape` - scrape single URL to markdown
  - `POST /scrape/articles` - extract article list from blog page
  - `GET /health` - health check endpoint
- Next.js integration:
  - `src/lib/scrapeService.ts` - HTTP client for scraper
  - `POST /api/scrape/trigger` - trigger scraping for a source
- Docker deployment:
  - `scraper/Dockerfile` - containerized Crawl4AI service
  - `docker-compose.yml` - full stack orchestration

### Dependencies
- Python: `crawl4ai>=0.4.24`, `fastapi>=0.109.0`, `uvicorn`
- Uses Playwright/Chromium for JavaScript rendering

---

## [2.4.0] - 2025-12-29 (Source Management)

### Added - Source Management (F4.2, F4.3, US4.1, US4.3)
- **Sources settings page** (`/settings/sources`) with full UI
- **Add private sources** - form to add custom websites to track
- **Toggle sources** - enable/disable sources without deleting
- **Delete sources** - remove private sources with confirmation
- **Catalog subscriptions** - subscribe/unsubscribe to shared sources

### Technical
- Full CRUD for private sources via existing API endpoints:
  - `GET /api/sources/private` - list user's private sources
  - `POST /api/sources/private` - create new private source
  - `PATCH /api/sources/private/[id]` - update source (toggle active)
  - `DELETE /api/sources/private/[id]` - delete source
- Catalog source subscription:
  - `GET /api/sources/catalog` - list available catalog sources
  - `POST /api/sources/catalog/subscribe` - subscribe/unsubscribe

---

## [2.3.0] - 2025-12-29 (Trash & Bug Fixes)

### Added - Trash/Dismiss Feature (F3.6, F3.7, US3.4)
- **Dismiss button** (X) on article cards to hide articles
- **Trash page** (`/trash`) to view dismissed articles
- **Restore functionality** to bring back dismissed articles
- **E2E tests** for article URL validation (`e2e/articles/article-links.spec.ts`)

### Fixed
- **Broken article URLs** in seed data (4 URLs returned 404)
  - oneusefulthing.org - missing `-an-opinionated` suffix
  - simonwillison.net - wrong article URL
  - huggingface.co/blog/smollm2 → smollm (smollm2 doesn't exist)
  - huyenchip.com - wrong article URL
- **Source filter count** - filters now update correctly after dismissing articles

### Added - Documentation
- **Editions feature** (F8) added to requirements.md
- **Epic 9: Wydania** added to user-stories.md
- **Scraping** added to backlog in requirements

### Technical
- New API endpoints:
  - `POST /api/articles/[id]/dismiss` - dismiss article
  - `DELETE /api/articles/[id]/dismiss` - restore article
  - `GET /api/trash` - list dismissed articles
- New Prisma model: `DismissedArticle`
- Added `data-testid` attributes to `ArticleCard` for E2E testing

---

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
