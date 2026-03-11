---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - docs/project-context.md
  - docs/implementation-brief.md
  - docs/bmad-brief-source-integrations.md
  - docs/requirements.md
  - docs/hld.md
  - docs/lld.md
  - docs/backlog.md
  - docs/oss-premium-split.md
  - docs/user-stories.md
  - docs/analysis-source-integrations.md
  - _bmad/bmm/planning-artifacts/research/market-news-consumption-ai-tts-research-2026-02-12.md
documentCounts:
  briefs: 2
  research: 1
  projectDocs: 7
  projectContext: 1
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# PRD: Premium Scheduled Sync (SCHED.1-6)

**Author:** Leszek
**Date:** 2026-03-11
**Project:** Leszek Newsroom AI (news.innocy.ai)
**Version:** 1.0

## Executive Summary

Premium Scheduled Sync to automatyczne pobieranie artykułów CRON-em wg harmonogramu usera. Cel: premium user otwiera apkę rano i ma artykuły gotowe — bez ręcznego sync.

**Problem:** Obecnie scraping odbywa się wyłącznie na żądanie (POST /api/scrape/trigger, GET /api/scrape/all). User musi pamiętać o kliknięciu "Sync" i czekać na wyniki.

**Rozwiązanie:** CRON endpoint iterujący po premium userach, odpalający istniejący pipeline scrapingu per-user, z auto-tworzeniem edition po zakończeniu.

**Kontekst:** Brownfield feature addition do Newsroom AI v2.8.0. Kod w `src/premium/` (proprietary license, Open Core model). Implementowany **przed** BILLING — tier gate via feature flag + manual DB flag.

**Backlog:** SCHED.1-6 z `docs/backlog.md`, zależność od ADR-014 w `docs/hld.md`.

## Success Criteria

### User Success

- **Artykuły gotowe rano:** Premium user otwiera apkę i widzi nowe artykuły z intro/summary bez ręcznego sync
- **Zero konfiguracji na start:** Scheduled sync aktywny domyślnie (godzina 6:00, pon-pt, UTC)
- **Pełna kontrola:** User może zmienić godzinę, dni tygodnia, timezone lub wyłączyć sync
- **Widoczność statusu:** User widzi w Settings kiedy był ostatni sync, ile artykułów pobrano, czy były błędy (Phase 2)

### Business Success

- **Argument sprzedażowy premium:** Scheduled sync jako kluczowy benefit premium tier na pricing page
- **Domyślna aktywacja:** 100% nowych premium userów ma sync włączony od momentu upgrade
- **Retencja:** Editions gotowe rano = nawyk porannego przeglądania = powód do codziennego otwierania apki

### Technical Success

- **Skalowalność:** Dowolna liczba premium userów, sekwencyjne przetwarzanie
- **Niezawodność:** Błąd jednego usera/źródła nie blokuje pozostałych
- **Auto-edition:** Po każdym sync automatyczne tworzenie edition (reuse editionService)
- **Logi:** Każdy sync logowany: start, koniec, liczba artykułów, błędy per źródło (Winston/stdout)

### Measurable Outcomes

| Metryka | Target |
|---------|--------|
| Sync wykonany wg harmonogramu | 99% dni (tolerancja ≤30 min) |
| Edition auto-utworzony po sync | 100% udanych synców |
| Izolacja błędów per user/source | 100% |
| Status sync widoczny w logach (MVP) / UI (Phase 2) | Tak |

## Project Scoping & Phased Development

### MVP Strategy

**Approach:** Problem-solving MVP — rozwiąż "artykuły gotowe rano" jak najprościej.

**Kluczowa decyzja:** Implementacja **przed** BILLING. Tier gate via `PREMIUM_ENABLED` env var + manual DB flag. Jedynym userem MVP jest operator — brak UI, konfiguracja bezpośrednio w DB.

**Resource Requirements:** Solo developer, istniejąca infrastruktura (Oracle Cloud, Docker, PostgreSQL).

### Phase 1: MVP

**Must-Have Capabilities:**

| # | Capability | Uzasadnienie |
|---|-----------|--------------|
| 1 | CRON endpoint `GET /api/cron/scrape-scheduled` | Core feature |
| 2 | Pola User model: syncEnabled, syncHour, syncDays, syncTimezone | Konfiguracja harmonogramu |
| 3 | Prisma migration | Nowe pola w DB |
| 4 | Sekwencyjny sync per-user (wszystkie źródła) | Przetwarzanie |
| 5 | Auto-edition po sync | Wydanie gotowe rano |
| 6 | Idempotency guard (max 1 sync/user/dzień) | Bezpieczeństwo |
| 7 | Structured logging (Winston) | Monitoring operatorski |
| 8 | Tier gate via feature flag + manual DB flag | Tymczasowy gate, bez Stripe |

**Explicitly OUT of MVP:**
- UI Settings sekcja Scheduled Sync (operator konfiguruje w DB)
- Upgrade CTA dla free users (brak billing)
- Sync history/status w UI (operator sprawdza w logach Docker)

### Phase 2: Growth (po BILLING)

- UI: sekcja "Scheduled Sync" w Settings (godzina/dni/timezone/toggle)
- Upgrade CTA dla free users
- Status sync w UI (ostatni sync, wynik, artykuły)
- Sync history (ostatnie N synców)
- Stripe tier gate zastępuje feature flag

### Phase 3: Expansion

- Push notification po sync
- Per-source scheduling
- Retry z exponential backoff
- Queue-based processing (BullMQ)
- Smart scheduling (AI)

### Risk Mitigation

| Ryzyko | Prawdop. | Impact | Mitygacja |
|--------|----------|--------|-----------|
| Sync trwa zbyt długo (wiele userów) | Niskie (1 user MVP) | Niski | Sekwencyjne, monitoring CPU/RAM |
| Błąd jednego źródła blokuje sync | Średnie | Średni | try/catch per source, izolacja |
| Duplikaty artykułów (sync + manual) | Średnie | Niski | Istniejąca deduplikacja URL |
| Cron nie odpala się | Niskie | Wysoki | Systemowy crontab + log check |

## User Journeys

### Journey 1: Marek — Premium user, poranne wydanie (Success Path)

**Persona:** Marek, 38 lat, product manager. Śledzi 15 źródeł (blogi AI, newslettery Gmail, LinkedIn). Rano ma 20 minut przy kawie.

**Opening Scene:** Marek każdego ranka otwierał Newsroom AI i klikał "Sync" — czekał 3-5 minut. Irytowało go to, bo te minuty zjadały okno porannej lektury. Czasem zapominał zsynchronizować.

**Rising Action:** Marek kupuje premium. Scheduled sync jest domyślnie włączony (6:00, pon-pt). Zmienia godzinę na 5:30, dodaje sobotę.

**Climax:** Następnego ranka o 6:45 otwiera apkę. Wydanie dnia gotowe — 14 artykułów z intro i streszczeniami. Włącza TTS playlist i słucha w drodze do pracy. Zero czekania.

**Resolution:** Marek codziennie otwiera apkę rano. Nie pamięta kiedy ostatnio klikał "Sync". Czuje kontrolę nad porannym rytuałem informacyjnym.

→ **Wymagania:** FR1-FR2, FR7-FR14

---

### Journey 2: Marek — Sync z błędem źródła (Edge Case)

**Opening Scene:** Marek otwiera apkę rano. Wydanie z 11 artykułami zamiast 14.

**Rising Action:** Gmail connector zwrócił błąd (token expired). Reszta 14 źródeł przetworzona normalnie.

**Climax:** Marek klika "Połącz ponownie Gmail" (istniejący re-auth flow). System odporny na pojedyncze awarie.

**Resolution:** Następnego ranka sync bez problemów — 14 artykułów, 0 błędów.

→ **Wymagania:** FR5-FR6, FR20-FR21

---

### Journey 3: Kasia — Free user widzi upgrade CTA (Phase 2)

**Persona:** Kasia, 29 lat, junior data scientist. Korzysta z free tier z BYO keys.

**Scena:** Kasia w Settings widzi zablokowaną sekcję "Scheduled Sync" z napisem "dostępny w Premium" i upgrade CTA. Po miesiącu manualnego syncu decyduje się na upgrade — sync aktywuje się automatycznie.

→ **Wymagania:** Phase 2 UI (nie w MVP)

---

### Journey 4: Leszek (Operator) — Monitoring synców

**Persona:** Leszek, operator news.innocy.ai na Oracle Cloud.

**Scena:** Sprawdza logi Docker — widzi: `[SCHED] Starting sync for user 5 (3/20)`, `[SCHED] User 5: 12 articles, 0 errors, 45s`, `[SCHED] Edition created for user 5`. CPU < 60%, sekwencyjne przetwarzanie stabilne.

→ **Wymagania:** FR20-FR22

---

### Journey Requirements Summary

| Journey | Wymagania | Faza |
|---------|-----------|------|
| Marek — Success | FR1-FR2, FR7-FR14 | MVP |
| Marek — Edge Case | FR5-FR6, FR20-FR21 | MVP |
| Kasia — Free CTA | UI upgrade CTA | Phase 2 |
| Leszek — Operator | FR20-FR22 | MVP |

## Web App Specific Requirements

### Technical Architecture

**Backend (CRON endpoint — MVP):**
- `GET /api/cron/scrape-scheduled` — wywoływany przez systemowy crontab co minutę
- Endpoint sprawdza: syncEnabled, aktualna godzina UTC vs syncHour/syncTimezone, dzień tygodnia vs syncDays
- Sekwencyjne przetwarzanie userów
- Reuse pipeline: `scrapeArticlesList()` → `generatePolishIntro()` → `addArticleToEdition()`
- Auto-edition: `createEdition()` z editionService

**Frontend (Settings UI — Phase 2):**
- Sekcja "Scheduled Sync" w istniejącej stronie `/settings`
- Komponenty: toggle on/off, time picker, checkboxy dni tygodnia, timezone select
- Premium only: free users widzą zablokowaną sekcję z upgrade CTA
- Status + historia synców (collapsible)
- Mobile-first (320px+), touch-friendly (min 44x44px), WCAG AA

### Implementation Considerations

- **Cron triggering:** Systemowy crontab co minutę → endpoint decyduje kto potrzebuje sync
- **Timezone handling:** IANA timezone string (np. "Europe/Warsaw"), konwersja na UTC
- **Idempotency:** Max 1 sync per user per dzień (sprawdzenie lastSyncAt)
- **Existing patterns:** Reuse wzorców z `/api/cron/editions`, `/api/cron/cleanup-trash`
- **Kod premium:** `src/premium/` (proprietary license, copyright header)

## Functional Requirements

### Scheduled Sync Execution

- **FR1:** System can automatically trigger article scraping for premium users according to their configured schedule
- **FR2:** System can determine which users need sync based on syncHour, syncDays, and syncTimezone
- **FR3:** System can process multiple premium users sequentially
- **FR4:** System can sync all sources of a user (catalog subscriptions, private sources, connectors) in a single run
- **FR5:** System can isolate sync failures per source — error in one source does not block remaining sources
- **FR6:** System can isolate sync failures per user — error for one user does not block remaining users

### Sync Schedule Configuration

- **FR7:** Premium user can have a configurable sync hour (0-23)
- **FR8:** Premium user can have configurable sync days of the week
- **FR9:** Premium user can have a configurable timezone (IANA format)
- **FR10:** Premium user can enable or disable scheduled sync
- **FR11:** System activates scheduled sync by default for new premium users (syncEnabled=true, hour=6, Mon-Fri, UTC)

### Edition Auto-Creation

- **FR12:** System automatically creates a daily edition after completing scheduled sync for a user
- **FR13:** System reuses existing editionService for auto-created editions
- **FR14:** Auto-created edition contains all articles scraped during the scheduled sync

### Idempotency & Safety

- **FR15:** System prevents multiple scheduled syncs for the same user on the same day
- **FR16:** System tracks last scheduled sync timestamp per user (lastSyncAt)

### Tier Gating

- **FR17:** System restricts scheduled sync to premium users only
- **FR18:** System uses feature flag (`PREMIUM_ENABLED`) as temporary tier gate (pre-Billing)
- **FR19:** System identifies premium users via manual DB flag (pre-Billing MVP)

### Observability

- **FR20:** System logs each sync run: user ID, start time, end time, duration
- **FR21:** System logs per-source results: source name, article count, error details
- **FR22:** System logs total run summary: users processed, total articles, total errors, total duration

## Non-Functional Requirements

### Reliability

- **NFR1:** Błąd jednego usera lub źródła nie zatrzymuje całego runu
- **NFR2:** Sync wykonuje się w zaplanowanym oknie z tolerancją ≤30 minut
- **NFR3:** Ponowne wywołanie endpointu w tym samym dniu nie powoduje duplikatu sync

### Security

- **NFR4:** Endpoint CRON zabezpieczony przed nieautoryzowanym wywołaniem (CRON secret token lub IP whitelist)
- **NFR5:** Tier gate uniemożliwia sync dla non-premium userów nawet przy bezpośrednim wywołaniu API
- **NFR6:** Credentials nie są eksponowane w logach; szyfrowanie AES-256-GCM bez zmian

### Scalability

- **NFR7:** Sekwencyjne przetwarzanie userów w MVP (brak wymogu równoległości)
- **NFR8:** CPU/RAM monitorowalne przez Docker metrics
- **NFR9:** Rosnąca liczba userów = dłuższy czas runu, bez zmian kodu

### Integration

- **NFR10:** Identyczny pipeline scrapingu co manual sync (scrapeArticlesList, generatePolishIntro, addArticleToEdition)
- **NFR11:** Auto-edition via istniejący editionService (brak duplikacji logiki)
- **NFR12:** Obsługa wszystkich typów źródeł: CatalogSource, PrivateSource (WEBSITE, GMAIL, LINKEDIN, TWITTER)
- **NFR13:** Logging via Winston (JSON, stdout)
