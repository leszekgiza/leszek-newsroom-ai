# Changelog

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
