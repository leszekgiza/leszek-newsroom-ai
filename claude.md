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

---

## Stan Implementacji (2025-12-29)

### Zaimplementowane (v2.2.0)
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

### Do Zaimplementowania (Następne)
- [ ] **Oznaczanie "nie interesuje mnie" + Kosz** (F3.6, F3.7, US3.4)
  - Przycisk X/kosz przy artykule
  - Tabela `dismissed_articles`
  - Strona `/trash`
  - Przywracanie artykułów
- [ ] Gmail integration
- [ ] LinkedIn integration
- [ ] Dodawanie własnych źródeł
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
