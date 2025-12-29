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

## Stan Implementacji (2025-12-29)

### Zaimplementowane (v2.4.0)
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

### Do Zaimplementowania (Następne)
- [ ] **Scraping (Crawl4AI)** - automatyczne pobieranie artykułów ze źródeł
- [ ] **Wydania (Editions)** - codzienne grupowanie artykułów (F8, Epic 9)
- [ ] Gmail integration
- [ ] LinkedIn integration
- [ ] PostgreSQL FTS (polski)

---

## Architektura

### Stack
- **Frontend:** Next.js 16, Tailwind CSS 4, Zustand
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Prisma 7)
- **AI:** Claude API (@anthropic-ai/sdk)
- **TTS:** edge-tts-universal

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
└── stores/              # Zustand stores
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

## Przydatne Komendy
```bash
npm run dev          # Development server
npm run db:seed      # Seed database
npx tsc --noEmit     # Check TypeScript
npx playwright test  # E2E tests
```
