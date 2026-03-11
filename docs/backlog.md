# Leszek Newsroom AI - Backlog

**Wersja:** 1.5
**Data:** 2026-03-05
**Aktualna wersja aplikacji:** 2.8.0

---

## Status Legend

| Status | Opis |
|--------|------|
| ✅ DONE | Zaimplementowane i przetestowane |
| 🔧 CODE WRITTEN | Kod napisany (tsc/lint/build OK), ale **nie przetestowany funkcjonalnie** |
| 🚧 IN PROGRESS | W trakcie implementacji |
| 📋 TODO | Do zrobienia |
| 🔮 FUTURE | Planowane na przyszłość (v3.0+) |

## Provider-agnostic + BYO keys (OSS)
- Core OSS nie jest zwiazany z jednym dostawca LLM/TTS
- Uzytkownik OSS dostarcza wlasne klucze API
- Dostawcy w backlogu sa tylko przykladami

---

## Sprint Backlog (Priorytet: MUST/SHOULD)

### Sprint TTS-PLAYLIST: Edition Playlist Player
**Cel:** Zamiana monolitycznego TTS wydania na playlist per-artykuł
**Story:** US9.4 (zaktualizowane)
**Priorytet:** MUST (najwyższy)
**Stan:** 🚧 IN PROGRESS

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| TTSP.1 | Dokumentacja | Aktualizacja requirements, user-stories, hld, lld, backlog | ✅ DONE | S |
| TTSP.2 | Summary w danych edycji | Dodanie summary do getEditionWithArticles, API route, page interface | ✅ DONE | S |
| TTSP.3 | EditionTTSPlayer rewrite | Playlist: per-article generation, cache, prefetch, prev/next, auto-advance | ✅ DONE | M |
| TTSP.4 | Testy manualne | Play, next, prev, auto-advance, prefetch, error, conflict z card TTS | 📋 TODO | S |
| TTSP.5 | Deprecated: old edition TTS API | Oznaczenie POST /api/editions/:id/tts jako deprecated | ✅ DONE | S |
| TTSP.6 | Auto-mark as read po odsłuchaniu | onended → markAsRead(articleId), aktualizacja badge NEW i unreadCount | ✅ DONE | S |

### Sprint DISMISS-EDITIONS: Dismiss z wydań + auto-cleanup Kosza
**Cel:** Dismiss artykułów z wydań, filtrowanie w TTS playlist, auto-cleanup po 15 dniach
**Story:** US3.4 (zaktualizowane)
**Priorytet:** SHOULD
**Stan:** ✅ DONE

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| DISM.1 | Dokumentacja | requirements, user-stories, hld, lld, backlog | ✅ DONE | S |
| DISM.2 | Filter dismissed w getEditionWithArticles | Prisma dismissedBy.none filter + dynamiczne counts | ✅ DONE | S |
| DISM.3 | updateEditionCounts() | Nowa funkcja w editionService — przelicza counts z excluded dismissed | ✅ DONE | S |
| DISM.4 | Dismiss endpoint — edition counts | POST/DELETE dismiss aktualizują edition articleCount/unreadCount | ✅ DONE | S |
| DISM.5 | Edition page — dismiss handler | dismissArticle() + onDismiss prop w ArticleCard | ✅ DONE | S |
| DISM.6 | Trash 15-day filter + cleanup cron | trashService.ts, /api/cron/cleanup-trash, filtr w /api/trash | ✅ DONE | M |
| DISM.7 | Trash page — banner 15 dni | Info "Artykuly w koszu sa automatycznie usuwane po 15 dniach" | ✅ DONE | S |

---

## Strategic Backlog (Open Source + Premium) - TODO

### S0. Points 1-3 (Documentation + PWA/Q&A + OSS/Premium split)
**Status:** TODO (do realizacji)
**Priorytet:** S0.1 -> S0.2 -> S0.3 -> S0.0 -> S0.4

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| S0.1 | Doc alignment + independence | Ujednolicenie dokumentacji z aktualnym kodem, AGPL, BYO keys, vendor-agnostic LLM/TTS | DONE | M |
| S0.2 | PWA MVP backlog | Manifest, offline cache, install prompt, media session, mobile UX | DONE | M |
| S0.3 | Q&A backlog (single article) | RAG/QA do pojedynczego artykulu + UI czatu | DONE | L |
| S0.0 | Authenticated sources plan (first step) | Logowanie, Gmail, LinkedIn: discovery + MVP plan + ryzyka/ToS | DONE | M |
| S0.4 | OSS/Premium repo split plan | Propozycja struktury repo + granice licencji i integracji | ✅ DONE | M |

### PWA MVP (Mobile-first) - TODO
**Cel:** Instalowalna PWA + podstawowe offline + audio w tle

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| PWA.1 | Manifest + icons | PWA manifest, ikony 192/512, theme/background color | DONE | S |
| PWA.2 | Service worker | Cache strategia (feed, editions, assets), offline fallback | DONE | M |
| PWA.3 | Install prompt UI | Widoczny przycisk instalacji (Add to Home Screen) | TODO | S |
| PWA.4 | Media Session | Sterowanie audio z lockscreen/notification | TODO | M |
| PWA.5 | Background audio | Odtwarzanie na mobile w tle (iOS/Android) | TODO | L |
| PWA.6 | Offline editions | Minimalny offline cache wybranego wydania | TODO | M |

### Q&A Single Article (Provider-agnostic) - TODO
**Cel:** Rozmowa z jednym artykulem, BYO keys, brak lock-in

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| QA.1 | API endpoint | POST /api/articles/[id]/qa (LLM provider-agnostic) | TODO | M |
| QA.2 | Context builder | Pobranie tresci + streszczenie jako kontekst | TODO | M |
| QA.3 | UI chat | Widok czatu w modalu lub osobnym ekranie | TODO | M |
| QA.4 | Cost guards | Limity tokenow/wiadomosci + walidacja BYO keys | TODO | M |
| QA.5 | Cache odpowiedzi | Cache QA per artykul (opcjonalnie) | TODO | S |

### Source Integrations (Gmail + LinkedIn + X) - PRIORYTET #1 📋 TODO
**Cel:** Precyzyjny import newsletterów z Gmaila, feed z LinkedIn, timeline z X/Twitter
**Analiza:** `docs/analysis-source-integrations.md` (v2.0, zatwierdzona przez PO)
**Mockupy:** `superdesign/design_iterations/ui_gmail_wizard_v2_1.html` + 4 inne
**Kolejność:** Gmail → LinkedIn → X/Twitter (decyzja PO)
**Architektura:** Gmail = Node.js (googleapis), LinkedIn + X = Python microservice (scraper/)

#### Sprint SI-1: Infrastructure + Gmail Auth (~2 tyg.)
**Cel:** Fundamenty connectorów + połączenie Gmail OAuth
**Story:** US14.1, US14.7
**Stan:** ✅ DONE - OAuth flow i Gmail API przetestowane z prawdziwymi credentials Google.

| ID | Zadanie | Opis | Status | Estimate | Zależy od |
|----|---------|------|--------|----------|-----------|
| CONN.1 | SourceConnector interface + registry | Wspólny interfejs (authenticate, fetchItems, validateConfig, getConnectionStatus, disconnect) + ConnectorFactory | ✅ DONE | S | - |
| CONN.2 | Credential encryption (AES-256-GCM) | Moduł szyfrowania: encrypt/decrypt, format iv:encrypted:authTag (base64), klucz z env CREDENTIALS_ENCRYPTION_KEY | ✅ DONE | M | - |
| GMAIL.1 | Google OAuth flow (test mode) | Consent screen (gmail.readonly), callback /api/auth/gmail/callback, zaszyfrowany refresh token w PrivateSource.credentials | ✅ DONE | M | CONN.2 |
| GMAIL.2 | Gmail API client | googleapis + google-auth-library: search (from:X newer_than:Nd), fetch message, list senders, auto-refresh access token | ✅ DONE | M | GMAIL.1 |

**Deliverable:** Użytkownik może połączyć Gmail przez OAuth i system wyszukuje maile po nadawcy.

#### Sprint SI-2: Gmail Content + Wizard (~2 tyg.)
**Cel:** Ekstrakcja treści maili + UI wizard z 3 ścieżkami dodawania nadawców
**Story:** US14.2
**Stan:** ✅ DONE - Wizard działa, HTML parser (cheerio) zaimplementowany.

| ID | Zadanie | Opis | Status | Estimate | Zależy od |
|----|---------|------|--------|----------|-----------|
| GMAIL.3 | Email HTML parser | MIME multipart → markdown (cheerio), newsletter content extraction, usuwanie headerów/footerów | ✅ DONE | M | GMAIL.2 |
| GMAIL.4 | Gmail connector | fetchItems z config.senders[], matchQuery, maxAgeDays=7, syncInterval=60, lastSyncMessageId | ✅ DONE | L | GMAIL.3 |
| GMAIL.5 | UI: Gmail Setup Wizard v2 | 3 zakładki: Wklej nadawcę / Wyszukaj (LLM) / Przeglądaj skrzynkę. Domyślnie NIC nie zaznaczone. Mockup: `ui_gmail_wizard_v2_1.html` | ✅ DONE | L | GMAIL.2 |
| GMAIL.6 | LLM query generation | Konwersja intencji użytkownika na Gmail query przez istniejący PAL (aiService.ts). Np. "newslettery o AI" → `subject:("AI" OR "machine learning") newer_than:90d` | ✅ DONE | M | GMAIL.2 |

**Deliverable:** Pełny Gmail connector - użytkownik dodaje nadawców (3 sposoby), system importuje maile jako artykuły.

#### Sprint SI-3: Connector Management + Dashboard (~1.5 tyg.)
**Cel:** Health monitoring, sync scheduler, dashboard UI, notyfikacje
**Story:** US14.6, US14.7
**Stan:** CONN.5 (Dashboard UI) ma kod (🔧). CONN.3, CONN.4, CONN.6 jeszcze 📋 TODO.

| ID | Zadanie | Opis | Status | Estimate | Zależy od |
|----|---------|------|--------|----------|-----------|
| CONN.3 | Connector health check + retry | Max 3 retries, exponential backoff (30s/2min/10min), status: connected→syncing→error→expired. Po 24h bez sukcesu → expired | 📋 TODO | M | CONN.1 |
| CONN.4 | Sync scheduler | Per-connector interwały (Gmail 60min, LinkedIn 120min, X 180min), rate limiting, manual "Synchronizuj teraz" | 📋 TODO | M | CONN.3 |
| CONN.5 | UI: Connector Status Dashboard | Status per connector, data sync, liczba artykułów, inline progress (paski Nadawcy/Maile), stats (nowe/pominięte/błędy). Mockup: `ui_connectors_dashboard_1.html` | ✅ DONE | M | CONN.1 |
| CONN.6 | UI: Notyfikacje credentials expired | Top banner per connector, przycisk re-auth, dismiss na 24h. Nieblokujące. Mockup: `ui_notification_credentials_expired_1.html` | 🔧 CODE WRITTEN | S | CONN.3 |

**Deliverable:** Strona Settings/Integrations z dashboardem connectorów, auto-sync, notyfikacje o wygasłych credentials.

#### Sprint SI-4: LinkedIn Connector (~2 tyg.)
**Cel:** Pełny connector LinkedIn (Voyager API, Python microservice) - model obserwowanych profili
**Story:** US14.3, US14.4, US14.8
**Stan:** 🔧 CODE WRITTEN - Kod napisany (tsc/lint/build OK), wymaga testów funkcjonalnych z prawdziwymi credentials. Nowe zadania LNKD.6-8 do zrobienia.

| ID | Zadanie | Opis | Status | Estimate | Zależy od |
|----|---------|------|--------|----------|-----------|
| LNKD.1 | LinkedIn auth (Voyager API) | linkedin-api (Python) login/hasło → Voyager session. Fallback: manual cookie li_at. Disclaimer o braku oficjalnego API i ryzyku bana | 🔧 CODE WRITTEN | L | CONN.2 |
| LNKD.2 | LinkedIn profile posts scraper | Python endpoint: `POST /linkedin/profile-posts`. Voyager API get_profile_posts(). Pobieranie postów per obserwowany profil | 🔧 CODE WRITTEN | L | LNKD.1 |
| LNKD.3 | LinkedIn post parser | JSON → markdown, author name, date, hashtags, repost detection | 🔧 CODE WRITTEN | M | LNKD.2 |
| LNKD.4 | LinkedIn connector | fetchItems, config (obserwowane profile, max postów per profil), API routes (auth/test/config/disconnect) | 🔧 CODE WRITTEN | M | LNKD.3 |
| LNKD.5 | UI: LinkedIn Setup Wizard | Login + disclaimer (akceptacja wymagana) + cookie fallback + test połączenia. Mockup: `ui_linkedin_wizard_v2_1.html` | 🔧 CODE WRITTEN | M | LNKD.1 |
| LNKD.6 | Search profiles endpoint (Python + API route) | Python: `POST /linkedin/search-profiles` + Next.js: `POST /api/connectors/linkedin/search-profiles`. Wyszukiwanie profili LinkedIn po imieniu/nazwisku | 📋 TODO | M | LNKD.1 |
| LNKD.7 | Profile posts endpoint (Python + zmiana connector) | Python: `POST /linkedin/profile-posts` per-profile. Zmiana connectora z feed na per-profile fetching | 📋 TODO | M | LNKD.2 |
| LNKD.8 | UI profile management (LinkedInWizard) | Wyszukiwanie profili, lista obserwowanych, dodawanie/usuwanie profili w LinkedInWizard | 📋 TODO | M | LNKD.5, LNKD.6 |

**Deliverable:** Użytkownik łączy LinkedIn, dodaje obserwowane profile, widzi ich posty jako artykuły z AI streszczeniami.

#### Sprint SI-5: X/Twitter Connector (~2 tyg.)
**Cel:** Pełny connector X/Twitter (Twikit, Python microservice)
**Story:** US14.5
**Stan:** 🔧 CODE WRITTEN - Kod napisany (tsc/lint/build OK), wymaga testów funkcjonalnych z prawdziwymi cookies.

| ID | Zadanie | Opis | Status | Estimate | Zależy od |
|----|---------|------|--------|----------|-----------|
| XTWT.1 | X auth (Twikit) | Cookies (auth_token + ct0) jako preferowana auth. Fallback: login/hasło (mniej stabilne). Twikit Python async | 🔧 CODE WRITTEN | L | CONN.2 |
| XTWT.2 | X timeline scraper | Python endpoint: `POST /twitter/timeline`. Twikit get_timeline(). Rate limit awareness | 🔧 CODE WRITTEN | L | XTWT.1 |
| XTWT.3 | Tweet parser | Retweet/reply detection, markdown conversion, author display | 🔧 CODE WRITTEN | M | XTWT.2 |
| XTWT.4 | X connector | fetchItems, config (Following/For You, include retweets, replies, threads), API routes (auth/test/config/disconnect) | 🔧 CODE WRITTEN | M | XTWT.3 |
| XTWT.5 | UI: X/Twitter Setup Wizard | Cookies/login + disclaimer + timeline config. Mockup: `ui_twitter_wizard_1.html` | 🔧 CODE WRITTEN | M | XTWT.1 |

**Deliverable:** Użytkownik łączy X/Twitter, widzi tweety z timeline jako artykuły z AI streszczeniami.

#### Podsumowanie Source Integrations

| Sprint | Zadania | Estimate łączny | Zależności |
|--------|---------|-----------------|------------|
| SI-1 | CONN.1, CONN.2, GMAIL.1, GMAIL.2 | S+M+M+M = ~12-20h | - |
| SI-2 | GMAIL.3, GMAIL.4, GMAIL.5, GMAIL.6 | M+L+L+M = ~22-44h | SI-1 |
| SI-3 | CONN.3, CONN.4, CONN.5, CONN.6 | M+M+M+S = ~10-20h | SI-1, SI-2 (wzorce UI) |
| SI-4 | LNKD.1-5 | L+L+M+M+M = ~28-42h | SI-1, SI-3 |
| SI-5 | XTWT.1-5 | L+L+M+M+M = ~28-42h | SI-1, SI-3 |
| **TOTAL** | **24 zadania** | **~100-168h** | **~8-12 tyg.** |

> **Nota:** LinkedIn (SI-4) i X/Twitter (SI-5) mogą być realizowane równolegle po SI-3, ale PO preferuje sekwencyjnie (Gmail → LinkedIn → X).

### 1. Wydania (Editions) - Epic 9 [SHOULD] ✅ DONE
**Cel:** Codzienne grupowanie artykułów jak w gazecie

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| E9.1 | Tabela editions w Prisma | US9.1 | ✅ DONE | S |
| E9.2 | API GET /api/editions - lista wydań | US9.1 | ✅ DONE | S |
| E9.3 | API GET /api/editions/[id] - artykuły wydania | US9.1 | ✅ DONE | S |
| E9.4 | Strona /editions - lista wydań | US9.1 | ✅ DONE | M |
| E9.5 | Badge z liczbą nieprzeczytanych w wydaniu | US9.1 | ✅ DONE | S |
| E9.6 | Widok kalendarza/lista dat | US9.2 | 🔮 FUTURE | M |
| E9.7 | Cron job - tworzenie wydania o północy | US9.3 | ✅ DONE | M |
| E9.8 | Ustawienie: domyślny widok (Feed/Wydanie) | US9.3 | ✅ DONE | S |
| E9.9 | ~~TTS monolityczne dla wydania~~ | US9.4 | ⬆️ REPLACED by E9.10 | M |
| E9.10 | TTS playlist player — osobne audio per artykuł, prev/next, prefetch | US9.4 | 🚧 IN PROGRESS | M |

### 2. Wyszukiwanie PostgreSQL FTS [MUST] ✅ DONE
**Cel:** Pełnotekstowe wyszukiwanie z obsługą języka polskiego

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| S1.1 | Migracja: kolumna search_vector tsvector | US3.3 | ✅ DONE | S |
| S1.2 | Indeks GIN dla wyszukiwania | US3.3 | ✅ DONE | S |
| S1.3 | Trigger do aktualizacji search_vector | US3.3 | ✅ DONE | M |
| S1.4 | API GET /api/articles?search=... | US3.3 | ✅ DONE | M |
| S1.5 | UI: pole wyszukiwania (mobile + desktop) | US3.3 | ✅ DONE | M |
| S1.6 | Live search z debounce 300ms | US3.3 | ✅ DONE | S |
| S1.7 | Podświetlanie dopasowanych fragmentów | US3.3 | ✅ DONE | M |

### 3. Infinite Scroll / Paginacja [MUST] ✅ DONE
**Cel:** Obsługa dużej liczby artykułów

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| P1.1 | API: paginacja w /api/articles | US1.1 | ✅ DONE | S |
| P1.2 | Infinite scroll component | US1.1 | ✅ DONE | M |
| P1.3 | Loading skeleton podczas ładowania | US1.1 | ✅ DONE | S |

### 4. Filtrowanie po źródle - ulepszenia [MUST] ✅ DONE
**Cel:** Pełna funkcjonalność filtrowania

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| F1.1 | Dropdown z listą źródeł | US1.2 | ✅ DONE | M |
| F1.2 | Licznik artykułów przy każdym źródle | US1.2 | ✅ DONE | S |
| F1.3 | Zachowanie filtru po odświeżeniu (URL params) | US1.2 | ✅ DONE | S |

### 5. TTS - wybór głosu [SHOULD] ✅ DONE
**Cel:** Personalizacja głosu TTS

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| T1.1 | UI: wybór głosu w ustawieniach | US2.3 | ✅ DONE | M |
| T1.2 | Zapisywanie preferencji głosu w DB | US2.3 | ✅ DONE | S |
| T1.3 | TTS działający w tle na mobile (Media Session API) | US2.3 | 📋 TODO | L |

### Landing Page + i18n [MUST] ✅ DONE
**Cel:** Landing page dla niezalogowanych z wielojęzycznością i waitlist signup
**Story:** US15.1, US15.2, US15.3

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| LP.1 | Dokumentacja | requirements, user-stories, hld, backlog, oss-premium-split | ✅ DONE | S |
| LP.2 | i18n config + translations (PL, EN) | config.ts, JSON files, helper | ✅ DONE | M |
| LP.3 | Middleware auth-aware routing | session check, locale rewrite, redirect logic | ✅ DONE | M |
| LP.4 | Landing layout + page | [locale]/(landing)/layout.tsx + page.tsx, CSS tokens | ✅ DONE | M |
| LP.5 | Landing components (12) | Navbar, Hero, Problem, Features, HowItWorks, OSS, Premium, Footer, etc. | ✅ DONE | L |
| LP.6 | Tłumaczenia (DE/FR/ES/IT/AR) | Generowanie + RTL test | ✅ DONE | M |
| LP.7 | Waitlist API + Prisma migration | POST /api/landing/waitlist, tabela waitlist_signups | ✅ DONE | M |
| LP.8 | Weryfikacja | lint, tsc, build OK. Brak pełnych E2E | 🔧 CODE WRITTEN | S |

### 6. Dark/Light Mode [SHOULD] 📋 TODO
**Cel:** Przełączanie między ciemnym a jasnym motywem

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| D6.1 | Toggle theme w headerze (desktop) i ustawieniach | US6.1 | 📋 TODO | M |
| D6.2 | Implementacja CSS zmiennych dla dark/light | US6.1 | 📋 TODO | M |
| D6.3 | Persistencja preferencji w DB (pole theme w User) | US6.1 | 📋 TODO | S |
| D6.4 | Opcja "Auto" - synchronizacja z systemem (prefers-color-scheme) | US6.1 | 📋 TODO | S |
| D6.5 | Aktualizacja wszystkich komponentów UI | US6.1 | 📋 TODO | L |

### 7. Provider Abstraction Layer [MUST for Q&A] 🚧 IN PROGRESS
**Cel:** Unified interfaces dla LLM/TTS/STT, provider-agnostic

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| PAL.1 | LLM provider interface (summary, Q&A, clustering) | NF6.1 | ✅ DONE | M |
| PAL.2 | TTS provider interface (article, edition, briefing) | NF6.2 | ✅ DONE | M |
| PAL.3 | STT provider interface (voice input) | NF6.3 | 📋 TODO | M |
| PAL.4 | Provider selection via env vars | NF6.4 | ✅ DONE | S |
| PAL.5 | Refactor existing LLM/TTS code to use interfaces | - | ✅ DONE | L |

### 8. Text Q&A per Article (OSS) 📋 TODO
**Cel:** Konwersacyjny agent - rozmowa z artykułem (BYO keys)

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| QA.1 | API endpoint POST /api/articles/[id]/chat | US10.1 | 📋 TODO | M |
| QA.2 | Context builder (article content + intro + summary) | US10.1 | 📋 TODO | M |
| QA.3 | SSE streaming odpowiedzi | US10.1 | 📋 TODO | M |
| QA.4 | UI chat (modal lub osobny ekran) | US10.1 | 📋 TODO | L |
| QA.5 | Cost guards (limity tokenów/wiadomości) | US10.2 | 📋 TODO | M |
| QA.6 | BYO keys validation | US10.2 | 📋 TODO | S |

### 9. Voice STT (Premium) 🔮 FUTURE
**Cel:** Push-to-talk voice input do Q&A
> Szczegółowy backlog: `docs/premium/backlog-premium.md`

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| VOICE.1 | STT provider interface + adapter | US11.1 | 📋 TODO | M |
| VOICE.2 | Push-to-talk UI (przycisk mikrofonu) | US11.1 | 📋 TODO | M |
| VOICE.3 | Audio recording + upload | US11.1 | 📋 TODO | M |
| VOICE.4 | STT → text → Q&A pipeline | US11.1 | 📋 TODO | L |
| VOICE.5 | TTS odpowiedź na pytanie głosowe | US11.1 | 📋 TODO | M |
| VOICE.6 | Feature flag (Premium only) | - | 📋 TODO | S |

### 10. Topic-Clustered Briefings (Premium) 🔮 FUTURE
**Cel:** AI-generowane briefingi pogrupowane tematycznie
> Szczegółowy backlog: `docs/premium/backlog-premium.md`

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| BRIEF.1 | AI topic clustering (artykuły → tematy) | US12.1 | 📋 TODO | L |
| BRIEF.2 | Briefing script generator | US12.1 | 📋 TODO | L |
| BRIEF.3 | TTS playback briefingu (podcast-style) | US12.1 | 📋 TODO | M |
| BRIEF.4 | UI: wybór tematów, kontrola głębokości | US12.1 | 📋 TODO | M |
| BRIEF.5 | Feature flag (Premium only) | - | 📋 TODO | S |

### 11. Multi-Article Q&A (Premium) 🔮 FUTURE
**Cel:** Q&A across wielu artykułów jednocześnie
> Szczegółowy backlog: `docs/premium/backlog-premium.md`

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| MULTI.1 | Multi-article context builder (z limitem tokenów) | US13.1 | 📋 TODO | L |
| MULTI.2 | UI: multi-select artykułów do kontekstu | US13.1 | 📋 TODO | M |
| MULTI.3 | Cytaty i źródła w odpowiedziach | US13.1 | 📋 TODO | M |
| MULTI.4 | Feature flag (Premium only) | - | 📋 TODO | S |

### 12. Subscription & Billing (Premium) 📋 TODO
**Cel:** Infrastruktura subskrypcji Stripe — fundament dla wszystkich premium features
**Story:** US16.1, US16.2, US16.3, US16.4
**Priorytet:** MUST (fundament premium)
**Zależności:** Brak (samodzielny)
**ADR:** ADR-013 w `docs/hld.md`

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| BILL.1 | Prisma schema | UserSubscription model (stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd) | 📋 TODO | M |
| BILL.2 | Stripe integration | Checkout session, webhooks (invoice.paid, customer.subscription.*), Customer Portal | 📋 TODO | L |
| BILL.3 | Middleware tier check | isPremiumUser() helper, per-request tier check via middleware | 📋 TODO | M |
| BILL.4 | API routes | /api/billing/checkout, /api/billing/webhook, /api/billing/portal | 📋 TODO | M |
| BILL.5 | Pricing page UI | Feature matrix (free vs premium), toggle monthly/yearly, CTA → Stripe Checkout | 📋 TODO | M |
| BILL.6 | Settings → Subscription management | Status subskrypcji, przycisk "Zarządzaj" → Customer Portal, upgrade CTA dla free | 📋 TODO | M |
| BILL.7 | Graceful downgrade logic | Webhook: subscription cancelled/expired → disable premium features, fallback providers | 📋 TODO | M |

### 13. ElevenLabs TTS (Premium) 📋 TODO
**Cel:** Premium TTS provider z głosami ElevenLabs
**Story:** US17.1, US17.2
**Priorytet:** SHOULD
**Zależności:** BILLING (wymaga tier check)

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| ELEVEN.1 | ElevenLabs provider | `src/lib/ai/tts-providers/elevenlabs.ts` — implementacja TTSProvider interface | 📋 TODO | M |
| ELEVEN.2 | Per-user provider selection | W `/api/tts/route.ts`: free → EdgeTTS, premium → ElevenLabs. Fallback na Edge gdy ElevenLabs niedostępny | 📋 TODO | M |
| ELEVEN.3 | UI: ElevenLabs voices w ustawieniach | Lista głosów ElevenLabs (premium only), preview, zapis preferencji. Upgrade CTA dla free users | 📋 TODO | M |
| ELEVEN.4 | Env var ELEVENLABS_API_KEY | Konfiguracja klucza API ElevenLabs w `.env.premium.example` | 📋 TODO | S |

### 14. Scheduled Background Scraping (Premium) 🚧 IN PROGRESS
**Cel:** Automatyczne pobieranie artykułów wg harmonogramu usera (premium only)
**Story:** US18.1, US18.2, US18.3
**Priorytet:** SHOULD
**Zależności:** BILLING (wymaga tier check) — MVP: feature flag + manual DB flag (pre-Billing)
**ADR:** ADR-014 w `docs/hld.md`
**PRD:** `_bmad/bmm/planning-artifacts/prd.md`

| ID | Zadanie | Opis | Status | Estimate |
|----|---------|------|--------|----------|
| SCHED.1 | Cron endpoint | `GET /api/cron/scrape-scheduled` — iteruje po premium userach z aktywnym schedule, triggeruje sync | ✅ DONE | L |
| SCHED.2 | User settings: syncSchedule | Pola w User model: syncEnabled, syncHour, syncDays, syncTimezone | ✅ DONE | M |
| SCHED.3 | Prisma migration | Nowe pola sync schedule w modelu User | ✅ DONE | S |
| SCHED.4 | Auto-tworzenie edition po sync | Po zakończeniu scheduled sync → automatyczne tworzenie edition (reuse istniejącej logiki) | ✅ DONE | S |
| SCHED.5 | UI: Settings → Scheduled Sync config | Sekcja w ustawieniach: godzina, dni tygodnia, timezone, toggle on/off. Premium only (upgrade CTA dla free) | 📋 TODO (Phase 2) | M |
| SCHED.6 | Tier gate | Free = manual sync only, Premium = scheduled + manual. MVP: feature flag `PREMIUM_ENABLED` + manual DB flag | ✅ DONE | S |

### Kolejność realizacji premium features

```
BILLING (Stripe infrastruktura) ← MUST, fundament dla wszystkiego
  ↓
ELEVEN (ElevenLabs TTS) ← zależy od tier check
SCHED (Scheduled scraping) ← zależy od tier check
  ↓
SI-3/SI-4/SI-5 (connectors testy) ← niezależne, premium-only na news.innocy.ai
  ↓
Voice STT / Briefings / Multi-Q&A ← FUTURE
```

---

## Definition of Done

Każde zadanie jest DONE gdy:
- [ ] Kod napisany i przechodzi `npx tsc --noEmit`
- [ ] `npm run lint` bez nowych błędów
- [ ] `npm run build` przechodzi
- [ ] Funkcjonalność przetestowana manualnie
- [ ] Dokumentacja zaktualizowana (requirements, user-stories, hld/lld jeśli zmiana architektury)
- [ ] Commit z opisem zmian

---

## Completed (✅ DONE)

### Editions
| Feature | Version |
|---------|---------|
| Tabela editions z relacją do artykułów | v2.6.0 |
| API endpoints dla wydań | v2.6.0 |
| Strona /editions z listą i szczegółami | v2.6.0 |
| TTS dla całego wydania | v2.8.0 |

### Search & Pagination
| Feature | Version |
|---------|---------|
| PostgreSQL Full-Text Search (FTS) | v2.6.0 |
| Infinite scroll z Intersection Observer | v2.7.0 |

### TTS & Preferences
| Feature | Version |
|---------|---------|
| Wybór głosu TTS w ustawieniach | v2.8.0 |
| Zapisywanie preferencji (theme, defaultView, ttsVoice) | v2.8.0 |

### Source Filtering
| Feature | Version |
|---------|---------|
| Dropdown z listą źródeł i licznikami | v2.8.0 |
| URL params sync (source, date) | v2.8.0 |

### Sync All Sources
| Feature | Version |
|---------|---------|
| SSE endpoint z postępem na żywo | v2.8.0 |
| SyncProgressModal z logami | v2.8.0 |
| Automatyczne tworzenie wydań | v2.8.0 |

---

## Estimates Legend

| Size | Hours | Description |
|------|-------|-------------|
| S | 1-2h | Mała zmiana |
| M | 3-6h | Średnia zmiana |
| L | 8-16h | Duża zmiana |
