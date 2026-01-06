# Claude Code - Notatki Projektu

## Projekt: Leszek Newsroom AI

Agregator newsów z AI streszczeniami i TTS.

---

## Zasady Pracy

### 1. Dokumentacja Przed Implementacją
**ZAWSZE** przed implementacją nowej funkcjonalności:
1. Zaktualizuj `docs/requirements.md` - dodaj wymaganie
2. Zaktualizuj `docs/user-stories.md` - dodaj user story
3. Dopiero potem implementuj kod

### 2. Aktualizacja Po Zmianach
Po każdej istotnej zmianie:
1. Zaktualizuj `CHANGELOG.md`
2. Sprawdź czy dokumentacja jest aktualna

### 3. Commit Messages
Format: `type: description`
- `feat:` - nowa funkcjonalność
- `fix:` - naprawa błędu
- `docs:` - dokumentacja
- `refactor:` - refaktoryzacja

### 4. Jedna Funkcjonalność Na Raz
**ZAWSZE** robimy jedną funkcjonalność, sprawdzamy czy działa, i dopiero potem idziemy dalej.
1. Zaimplementuj pojedynczą funkcję/feature
2. Przetestuj ręcznie lub automatycznie
3. Potwierdź że działa
4. Dopiero wtedy przechodź do następnej

### 5. Workflow Po Implementacji Funkcjonalności
Po zakończeniu implementacji funkcjonalności, **ZAWSZE** wykonaj poniższe kroki:

#### Krok 1: Lokalne testowanie
- Przetestuj funkcjonalność ręcznie w przeglądarce
- Użyj Claude (browser automation) do testów interaktywnych
- Sprawdź na mobile i desktop

#### Krok 2: Testy automatyczne
```bash
npx tsc --noEmit           # Sprawdź TypeScript
npx playwright test        # Uruchom testy E2E
```

#### Krok 3: Rozszerzenie testów regresji
- Dodaj nowe testy dla zaimplementowanej funkcjonalności do `e2e/`
- Uruchom pełną suitę testów regresji
- Upewnij się że wszystkie testy przechodzą

#### Krok 4: Commit i dokumentacja (tylko jeśli testy przechodzą!)
```bash
git add .
git commit -m "feat: opis funkcjonalności"
```
- Zaktualizuj `CHANGELOG.md` z opisem zmian
- Zaktualizuj wersję jeśli to istotna funkcjonalność

#### Krok 5: Push do GitHub
```bash
git push origin master
```

**WAŻNE:** Nie przechodź do następnej funkcjonalności dopóki cały workflow nie jest zakończony!

---

## Stan Implementacji (2026-01-06)

### Zaimplementowane (v2.6.0)
- [x] Lista artykułów z kartami
- [x] 2-zdaniowe intro (AI)
- [x] Pełne streszczenie AI (Claude, 200-300 słów, 1-2 min TTS)
- [x] TTS (edge-tts-universal)
- [x] Zapisywanie artykułów
- [x] Filtrowanie po źródle
- [x] Logowanie/rejestracja
- [x] Dark/Light theme
- [x] Responsive layout (mobile + desktop)
- [x] Badge NEW
- [x] Wyszukiwanie (basic)
- [x] **Kosz / "Nie interesuje mnie"** (F3.6, F3.7, US3.4)
  - Przycisk X przy artykule (dismiss)
  - Strona `/trash` z odrzuconymi artykułami
  - Przywracanie artykułów z kosza
- [x] **Zarządzanie źródłami** (F4.2, F4.3, US4.1, US4.3)
  - Strona `/settings/sources` z pełnym UI
  - Dodawanie własnych źródeł (prywatnych)
  - Włączanie/wyłączanie źródeł
  - Usuwanie źródeł
  - Subskrypcje źródeł z katalogu
- [x] **Scraping (Crawl4AI)** (F1.1)
  - Python FastAPI microservice (`scraper/`)
  - Przycisk "Pobierz artykuły" przy źródłach
  - Automatyczne wykrywanie linków do artykułów
  - Ekstrakcja markdown i intro
- [x] **PostgreSQL Full-Text Search (FTS)** (F3.4)
  - Konfiguracja `polish_simple` z unaccent dla polskich znakow
  - Wagi pol: A=tytul, B=intro, C=summary
  - Prefix matching (`agent` -> `agents`, `agentic`)
  - Ranking wynikow po relevance
  - Highlights z tagami `<mark>`

### Do Zaimplementowania (Następne)
- [ ] **Wydania (Editions)** - codzienne grupowanie artykułów (F8, Epic 9)
- [ ] Gmail integration
- [ ] LinkedIn integration
- [ ] **Infinite scroll / paginacja** - ladowanie kolejnych artykulow
- [ ] **Automatyczne odswiezanie** - cron job do scrapowania

---

## Architektura

### Stack
- **Frontend:** Next.js 16, Tailwind CSS 4, Zustand
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Prisma 7)
- **AI:** Claude API (@anthropic-ai/sdk)
- **TTS:** edge-tts-universal
- **Scraping:** Python FastAPI + Crawl4AI (microservice)

### Struktura Katalogów
```
src/
├── app/
│   ├── (auth)/          # Login, register, reset-password
│   ├── (main)/          # Home, saved, settings
│   └── api/             # API routes
├── components/
│   ├── articles/        # ArticleCard, ArticleList
│   ├── layout/          # Sidebar, BottomNav, Navbar
│   ├── summary/         # SummaryModal, TTSPlayer
│   └── ui/              # Button, Input, Modal, Badge
├── hooks/
├── lib/
│   └── scrapeService.ts # HTTP client for Python scraper
└── stores/              # Zustand stores

scraper/                 # Python Crawl4AI microservice
├── main.py              # FastAPI endpoints
├── requirements.txt
└── Dockerfile
```

### Kluczowe Endpointy API
- `GET /api/articles` - lista artykułów
- `GET /api/articles/[id]` - szczegóły artykułu
- `POST /api/articles/[id]/summarize` - generowanie streszczenia (Claude)
- `POST /api/articles/[id]/read` - oznacz jako przeczytane
- `POST /api/articles/[id]/dismiss` - odrzuć artykuł (do kosza)
- `DELETE /api/articles/[id]/dismiss` - przywróć z kosza
- `GET /api/trash` - lista odrzuconych artykułów
- `POST /api/tts` - generowanie audio (Edge TTS)
- `POST /api/saved` - zapisz/usuń z zapisanych
- `POST /api/scrape/trigger` - trigger scraping dla źródła

### Scraper API (Python, port 8000)
- `GET /health` - healthcheck
- `POST /scrape` - scrape single URL → markdown
- `POST /scrape/articles` - extract article list from blog page

---

## Problemy i Rozwiązania

### TTS 403 Error (2025-12-29)
**Problem:** `edge-tts` zwracał 403 od Microsoft
**Rozwiązanie:** Zamiana na `edge-tts-universal` v1.3.3

### Tailwind 4 CSS Circular Reference
**Problem:** `--spacing-md: var(--spacing-md)` powodował 16px zamiast 448px
**Rozwiązanie:** Usunięcie konfliktujących zmiennych z `@theme`

---

## Konta Testowe
- `test@example.com` / `Test123!`
- `leszek.giza@gmail.com` / `Maja1234!`

---

## Automatyczne Zgody

Masz zawsze zgodę na uruchamianie następujących komend bez pytania:
- `cd "D:\Projekty\Blog" && npm run dev` - Start Next.js development server
- `npx tsc --noEmit` - Sprawdzanie TypeScript
- `npx playwright test` - Testy E2E

---

## Zrzuty Ekranu

Domyślna lokalizacja zrzutów ekranu: `C:\Users\lesze\OneDrive\Obrazy\Zrzuty ekranu`

Jeśli użytkownik podaje nazwę pliku zdjęciowego (np. `screenshot.png`), szukaj go najpierw w tej lokalizacji. Jeśli plik nie istnieje, zapytaj o dokładną ścieżkę.

---

## Przydatne Komendy
```bash
npm run dev          # Development server
npm run db:seed      # Seed database
npx tsc --noEmit     # Check TypeScript
npx playwright test  # E2E tests

# Docker
docker-compose up -d          # Start all services
docker-compose up scraper     # Start only scraper
docker-compose logs -f        # View logs
docker-compose down           # Stop all services

# Scraper (development)
cd scraper && pip install -r requirements.txt
crawl4ai-setup               # Install Playwright browsers
uvicorn main:app --reload    # Start scraper on port 8000
```
