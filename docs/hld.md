# Leszek Newsroom AI - High-Level Design (HLD)

**Wersja:** 1.4
**Data:** 2026-02-09
**Status:** Draft

---

## 1. Przegląd Systemu

### 1.1 Cel
System agregacji treści z wielu źródeł internetowych z automatycznym generowaniem streszczeń AI i funkcją Text-to-Speech.

### 1.2 Główne Funkcje
- Scraping artykułów ze stron internetowych (Crawl4AI)
- Generowanie 2-zdaniowych intro i pełnych streszczeń (LLM provider-agnostic, przykład: Claude)
- Text-to-Speech dla streszczeń i wydań (TTS provider-agnostic, przykład: Edge TTS)
- Wyszukiwanie full-text w języku polskim (PostgreSQL FTS)
- Codzienne wydania (Editions) z TTS playlist per artykuł (prev/next, prefetch)
- PWA z offline support (manifest, service worker, installable)
- SSE streaming dla postępu scrapowania
- Source Integrations: Gmail (OAuth + 3 ścieżki importu nadawców), LinkedIn (Voyager API + obserwowane profile per-user), X/Twitter (Twikit)
- Architektura dwujęzyczna: Gmail w Node.js, LinkedIn + X w Python microservice (scraper/)
- Autentykacja użytkowników
- **Planowane:** Text Q&A per article (OSS), Voice STT, Briefings, Multi-Article Q&A (Premium)

### 1.3 Architektura Źródeł (Catalog vs Private)

System rozróżnia dwa typy źródeł dla efektywności i prywatności:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CATALOG SOURCES (shared)                      │
│  • Publiczne blogi: Ethan Mollick, Simon Willison, Eugene Yan   │
│  • Scrapowane RAZ dla wszystkich użytkowników                   │
│  • Users SUBSKRYBUJĄ źródła z katalogu                          │
│  • Artykuły widoczne dla wszystkich subskrybentów               │
└─────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────┐
│                    PRIVATE SOURCES (per-user)                    │
│  • Strony z auth: strefainwestora.pl (user podaje credentials)  │
│  • Gmail: OAuth + precyzyjny import (3 ścieżki, LLM matching)  │
│  • LinkedIn: Voyager API (linkedin-api Python) + profile tracking│
│  • X/Twitter: Twikit (Python, async) + cookies auth             │
│  • Scrapowane PER-USER, widoczne TYLKO dla właściciela          │
└─────────────────────────────────────────────────────────────────┘
```

| Typ źródła | Scraping | Widoczność | Przykłady |
|------------|----------|------------|-----------|
| **CatalogSource** | Raz dla wszystkich | Subskrybenci | Mollick, Willison, HuggingFace |
| **PrivateSource** | Per-user | Tylko owner | Gmail, LinkedIn, strefainwestora |

**Korzyści:**
- 1000 userów = 1 scrape per public source (efektywność)
- Prywatne dane izolowane per-user (bezpieczeństwo)
- "Odkryj źródła" - katalog do przeglądania

**Future (v3.0):**
- Topic-based discovery (user definiuje tematy, AI szuka)
- Dzienny podcast z podsumowaniem

### 1.4 Niezależność dostawców (Provider-agnostic + BYO keys)
- Core OSS nie jest związany z jednym dostawcą LLM/TTS
- Użytkownik OSS dostarcza własne klucze API (BYO keys)
- W dokumentacji nazwy dostawców są tylko przykładami, nie zależnościami

---

## 2. Architektura Systemu

### 2.1 Styl Architektoniczny
**Modular Monolith** - pojedyncza aplikacja z wyraźnie oddzielonymi modułami.

**Uzasadnienie:**
- Prostota wdrożenia na Oracle Cloud Free Tier
- Łatwiejsze debugowanie i development
- Możliwość późniejszego wydzielenia mikroserwisów (scraper, AI)

### 2.2 Diagram Kontekstowy (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                         UŻYTKOWNICY                              │
│                    (Przeglądarka / PWA Mobile)                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEWSROOM AI SYSTEM                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Frontend   │  │   Backend   │  │  Python Microservice    │  │
│  │  (Next.js)  │◄─┤  (Node.js)  │◄─┤  (scraper/)            │  │
│  └─────────────┘  └──────┬──────┘  │  • Crawl4AI (scraping) │  │
│                          │         │  • linkedin-api (feed)  │  │
│                   ┌──────▼──────┐  │  • twikit (timeline)   │  │
│                   │ PostgreSQL  │  └─────────────────────────┘  │
│                   └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
              │         │         │         │
    ┌─────────┘         │         │         └─────────┐
    ▼                   ▼         ▼                   ▼
┌─────────┐      ┌──────────┐ ┌──────────┐     ┌──────────┐
│ LLM API │      │  Gmail   │ │ LinkedIn │     │ X/Twitter│
│ (BYO)   │      │  (OAuth) │ │ (Voyager)│     │ (Twikit) │
└─────────┘      └──────────┘ └──────────┘     └──────────┘
```

### 2.3 Diagram Komponentów (C4 Level 2)

```
┌────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                            │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │    Pages     │  │  Components  │  │    Hooks     │  │   Stores   │ │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├────────────┤ │
│  │ /            │  │ ArticleCard  │  │ useArticles  │  │ authStore  │ │
│  │ /saved       │  │ SummaryModal │  │ useTTS       │  │ uiStore    │ │
│  │ /editions    │  │ TTSPlayer    │  │ useSearch    │  │ playerStore│ │
│  │ /settings    │  │ SearchBar    │  │ useSources   │  │            │ │
│  │ /settings/   │  │ SourceFilter │  │ useConnector │  │            │ │
│  │  integrations│  │ GmailWizard  │  │              │  │            │ │
│  │ /login       │  │ LinkedInWiz  │  │              │  │            │ │
│  │ /register    │  │ TwitterWiz   │  │              │  │            │ │
│  │              │  │ ConnectorDash│  │              │  │            │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API / Server Actions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Python)                          │
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Node.js (Next.js API Routes)                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │ │
│  │  │     API      │  │   Services   │  │     Connectors          │ │ │
│  │  │   Routes     │  │              │  │                          │ │ │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────────────────┤ │ │
│  │  │ /articles    │  │ ArticleSvc   │  │ ConnectorInterface       │ │ │
│  │  │ /sources     │  │ ScrapeSvc    │  │ GmailConnector (Node.js) │ │ │
│  │  │ /auth        │  │ SummarySvc   │  │ LinkedInConnector (→Py)  │ │ │
│  │  │ /connectors  │  │ TTSSvc       │  │ TwitterConnector (→Py)   │ │ │
│  │  │ /tts         │  │ GmailSvc     │  │ ConnectorFactory         │ │ │
│  │  │ /editions    │  │ ConnectorSvc │  │ CredentialEncryption     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │ HTTP                              │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Python Microservice (scraper/)                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │ │
│  │  │   FastAPI    │  │   Crawl4AI   │  │   Social Connectors     │ │ │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────────────────┤ │ │
│  │  │ /scrape      │  │ Web scraping │  │ linkedin-api (Voyager)  │ │ │
│  │  │ /linkedin/*  │  │ JS rendering │  │ twikit (async timeline) │ │ │
│  │  │ /twitter/*   │  │              │  │                          │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │                                   │
│                                    ▼                                   │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         DATA LAYER                                │ │
│  │  ┌──────────────────────────────┐  ┌────────────────────────────┐ │ │
│  │  │         PostgreSQL           │  │      File Storage          │ │ │
│  │  ├──────────────────────────────┤  ├────────────────────────────┤ │ │
│  │  │ users, sessions             │  │ /audio (TTS cache)         │ │ │
│  │  │ articles, editions          │  │                            │ │ │
│  │  │ catalog_sources             │  │                            │ │ │
│  │  │ private_sources (encrypted) │  │                            │ │ │
│  │  │ saved/read/dismissed        │  │                            │ │ │
│  │  └──────────────────────────────┘  └────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                      ┌─────────────┼─────────────┐
                      ▼             ▼             ▼
               ┌────────────┐ ┌──────────┐ ┌──────────┐
               │  LLM API   │ │  Gmail   │ │  TTS API │
               │  (BYO key) │ │  (OAuth) │ │ (BYO key)│
               └────────────┘ └──────────┘ └──────────┘
```

Note: Nazwy dostawcow w diagramach sa tylko przykladami. Core OSS jest
provider-agnostic i wymaga BYO keys. LinkedIn i X/Twitter nie mają
oficjalnych API - używamy nieoficjalnych bibliotek (Voyager API, Twikit).

---

## 3. Stack Technologiczny

### 3.1 Frontend
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Framework | Next.js 16.1.1 (App Router) | SSR, Server Actions, dobry DX |
| Styling | Tailwind CSS | Szybki development, spójność z UI designs |
| State | Zustand | Lekki, prosty, wystarczający |
| HTTP | fetch / Server Actions | Wbudowane w Next.js |
| Forms | React Hook Form + Zod | Walidacja, performance |

### 3.2 Backend
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Runtime | Node.js 20+ | LTS, stabilność |
| Framework | Next.js API Routes | Pełna integracja z frontendem |
| ORM | Prisma | Type-safety, migracje, PostgreSQL support |
| Auth | Własny JWT cookie auth | Prostota, brak zewnętrznych zależności |
| Jobs | node-cron | Proste scheduled tasks |
| Validation | Zod | Współdzielone z frontendem |

### 3.3 Scraping + Social Connectors (Python Microservice)
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Engine | Crawl4AI | Open source, LLM-ready output |
| Runtime | Python 3.11+ (Docker) | Wymagane przez Crawl4AI, linkedin-api, twikit |
| Browser | Playwright | JS rendering, login support (Crawl4AI) |
| LinkedIn | linkedin-api (Voyager API) | Obserwowane profile per-user (oficjalne API zamknięte 06/2023) |
| X/Twitter | twikit (async) | Python async scraper, cookies/login auth, rate limit 600/15min |
| Framework | FastAPI | Już używany przez Crawl4AI scraper |

### 3.4 AI & TTS
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| LLM | Provider-agnostic (przykład: Claude) | Jakość streszczeń, polski |
| TTS | Provider-agnostic (przykład: Edge TTS) | Darmowe, polski głos |

**BYO keys (OSS):**
- Użytkownik dostarcza własne klucze API
- Brak bezpłatnych limitów w core OSS
- Dostawcy są przykładami, nie zależnościami

### 3.5 Database
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| RDBMS | PostgreSQL 15+ | FTS polski, reliability |
| Search | pg_trgm + tsvector | Full-text search |
| Cache | In-memory (LRU) | Proste, wystarczające |

### 3.6 Infrastructure
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Server | Oracle Cloud Free Tier | Darmowe, 4 vCPU, 24GB RAM |
| OS | Ubuntu 22.04 LTS | Stabilność |
| Container | Docker + Docker Compose | Crawl4AI isolation |
| Reverse Proxy | Nginx | SSL, static files |
| SSL | Let's Encrypt | Darmowe certyfikaty |

---

## 4. Przepływ Danych

### 4.1 Scraping Flow

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│  Cron   │────▶│ Backend │────▶│ Crawl4AI │────▶│  Claude  │────▶│ Database│
│  Job    │     │ Service │     │ (Docker) │     │   API    │     │         │
└─────────┘     └─────────┘     └──────────┘     └──────────┘     └─────────┘
    │                │                │                │               │
    │                │                │                │               │
    ▼                ▼                ▼                ▼               ▼
 Co 30 min      Pobierz         Scrape URL       Generuj          Zapisz
 trigger        źródła          → Markdown       intro +          artykuł
                użytkownika                      summary
```

### 4.2 Read Flow (User)

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Browser │────▶│ Next.js │────▶│ API Route│────▶│ Database │
│         │◀────│  SSR    │◀────│          │◀────│          │
└─────────┘     └─────────┘     └──────────┘     └──────────┘
    │                                                  │
    │           Render artykułów                       │
    │           z intro (już wygenerowane)             │
    ▼                                                  ▼
 Użytkownik                                    SELECT z FTS
 widzi listę                                   i paginacją
```

### 4.3 Connector Sync Flow (Gmail / LinkedIn / X)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Scheduler   │────▶│  Node.js     │────▶│  Connector   │────▶│ Database │
│  (per-conn)  │     │  Backend     │     │  (type-spec) │     │          │
└──────────────┘     └──────┬───────┘     └──────────────┘     └──────────┘
    │                       │                    │
    │                       │                    │
    ▼                       ▼                    ▼
 Gmail: 60min         Decrypt             Gmail: googleapis (Node.js)
 LinkedIn: 120min     credentials         LinkedIn: HTTP → Python /linkedin/profile-posts
 X/Twitter: 180min    (AES-256-GCM)       X/Twitter: HTTP → Python /twitter/timeline
                                                │
                                                ▼
                                          Parse content
                                          → Article {url, title, content}
                                          → AI intro + summary (LLM)
                                          → Save to DB + assign to Edition
```

**Status transitions per sync:**
```
connected ──sync──▶ syncing ──success──▶ connected
                        │
                        ├──failure──▶ error (retry 1/3)
                        │                    │
                        │               ├──failure──▶ error (retry 2/3)
                        │               │                    │
                        │               │               ├──failure──▶ error (retry 3/3)
                        │               │               │                    │
                        │               │               │               24h timeout
                        │               │               │                    │
                        │               │               │                    ▼
                        │               │               │               expired
                        │               │               │               (re-auth needed)
                        └──success──────┴──success──────┘
```

### 4.4 TTS Flow

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Browser │────▶│ API     │────▶│ Edge TTS │────▶│  Cache   │
│ (click) │     │ /tts    │     │          │     │ (file)   │
└─────────┘     └─────────┘     └──────────┘     └──────────┘
    │                                                  │
    │◀─────────────────────────────────────────────────│
    │              Audio stream / URL                  │
    ▼
 <audio> player
```

**Edition TTS Playlist Flow:**
```
┌─────────┐     ┌──────────────────┐     ┌─────────┐
│ Edition │────▶│ EditionTTSPlayer │────▶│ /api/tts│ (per article)
│  Page   │     │  (playlist)      │     │         │
└─────────┘     └──────────────────┘     └─────────┘
                  │ track 1: play ────────▶ synthesize
                  │ track 2: prefetch ────▶ synthesize (background)
                  │ track 3: pending
                  ▼
               <audio> player (prev/play/next)

Gdy track kończy się naturalnie (onended), artykuł jest auto-oznaczany jako przeczytany
via POST /api/articles/:id/read. Ręczne skip (next/prev) NIE oznacza jako przeczytany.
Dismissed artykuły filtrowane z playlisty via `dismissedBy` relation w getEditionWithArticles().
```

**Trash Auto-Cleanup:**
```
Cron: GET /api/cron/cleanup-trash (01:00 UTC daily)
  → DismissedArticle records starsze niż 15 dni:
    - Catalog articles: record persist (permanently hidden, Article stays for other users)
    - Private articles: Article DELETE z DB (cascade cleans junction records)
  → /api/trash query: dismissedAt >= cutoff (only last 15 days shown)
```

---

## 5. Bezpieczeństwo

### 5.1 Autentykacja
- **Metoda:** Email/hasło + opcjonalnie OAuth (Google)
- **Sesje:** HTTP-only cookies, JWT wewnętrznie
- **Hasła:** bcrypt (cost factor 12)

### 5.2 Autoryzacja
- **Model:** User-based isolation
- **Reguły:** Użytkownik widzi tylko swoje dane (sources, saved)

### 5.3 Szyfrowanie
- **Transport:** HTTPS (TLS 1.3)
- **At Rest:** AES-256-GCM dla credentials (OAuth tokens, hasła, cookies)
- **Format:** `iv:encrypted:authTag` (base64)
- **Klucz:** 32 bajty z env var `CREDENTIALS_ENCRYPTION_KEY`
- **Rotacja:** Manual (v1), automated (v2)

### 5.4 Rate Limiting
- **API:** 100 req/min per user
- **Scraping:** 1 req/s per domain
- **AI:** Queue z limitem concurrent requests

---

## 6. Skalowalność

### 6.1 Obecne Założenia (MVP)
- 1-10 użytkowników
- ~1000 artykułów w bazie
- Single server deployment

### 6.2 Przyszłe Rozszerzenia
| Bottleneck | Rozwiązanie |
|------------|-------------|
| Scraping | Wydzielenie do osobnego worker |
| AI summaries | Queue (Bull/BullMQ) |
| Database | Read replicas |
| TTS | CDN dla audio cache |

---

## 7. Deployment

### 7.1 Architektura Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Cloud VM                           │
│                    (Ubuntu 22.04)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────────────────────────┐    │
│  │    Nginx    │────▶│        Docker Compose           │    │
│  │   :80/:443  │     │  ┌───────────┐  ┌───────────┐   │    │
│  └─────────────┘     │  │  Next.js  │  │ Crawl4AI  │   │    │
│         │            │  │   :3000   │  │   :8000   │   │    │
│         │            │  └───────────┘  └───────────┘   │    │
│         │            │         │              │        │    │
│         │            │         ▼              │        │    │
│         │            │  ┌───────────┐         │        │    │
│         │            │  │PostgreSQL │◀────────┘        │    │
│         │            │  │   :5432   │                  │    │
│         │            │  └───────────┘                  │    │
│         │            └─────────────────────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                            │
│  │ Let's       │                                            │
│  │ Encrypt     │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Środowiska
| Środowisko | Cel | URL |
|------------|-----|-----|
| Development | Lokalne dev | localhost:3000 |
| Production | Live | newsroom.example.com |

---

## 8. Monitorowanie

### 8.1 Logi
- **Application:** Winston → stdout (Docker logs)
- **Nginx:** Access + error logs
- **PostgreSQL:** slow query log

### 8.2 Health Checks
- `/api/health` - status aplikacji
- PostgreSQL connection check
- Crawl4AI availability

### 8.3 Metryki (przyszłość)
- Request latency
- Scraping success rate
- AI generation time

---

## 9. Decyzje Architektoniczne (ADR)

### ADR-001: Modular Monolith zamiast Microservices
**Status:** Accepted
**Kontekst:** Wybór architektury dla MVP
**Decyzja:** Monolith z wyraźnymi modułami
**Konsekwencje:** Prostsze wdrożenie, łatwiejszy rozwój, możliwość późniejszego wydzielenia

### ADR-002: Next.js jako full-stack framework
**Status:** Accepted
**Kontekst:** Potrzeba SSR + API w jednym
**Decyzja:** Next.js 16.1.1 z App Router
**Konsekwencje:** Jeden codebase, Server Actions, dobre SEO

### ADR-003: PostgreSQL FTS zamiast Elasticsearch
**Status:** Accepted
**Kontekst:** Wyszukiwanie w języku polskim
**Decyzja:** PostgreSQL Full-Text Search z konfiguracją `polish`
**Konsekwencje:** Brak dodatkowej infrastruktury, wystarczająca wydajność dla MVP

### ADR-004: Provider-agnostic TTS (przykład: Edge TTS)
**Status:** Accepted
**Kontekst:** TTS dla streszczeń
**Decyzja:** Core OSS niezależny od dostawcy; Edge TTS jako przykładowy provider
**Konsekwencje:** Brak lock-in, użytkownik wybiera dostawcę i klucze

### ADR-005: API-First Architecture
**Status:** Accepted
**Kontekst:** Potrzeba separacji logiki biznesowej od UI, możliwość przyszłej integracji z aplikacją mobilną lub innymi klientami
**Decyzja:** Cała funkcjonalność dostępna przez REST API (`/api/*`), UI jest konsumentem API
**Konsekwencje:**
- Łatwe testowanie API niezależnie od UI
- Możliwość budowy aplikacji mobilnej w przyszłości
- Możliwość integracji z zewnętrznymi narzędziami (CLI, automatyzacje)
- Jasny kontrakt między frontendem a backendem

### ADR-006: Editions (Daily Grouping)
**Status:** Accepted (Implemented v2.6.0)
**Kontekst:** Użytkownicy chcą przeglądać artykuły pogrupowane chronologicznie jak w gazecie
**Decyzja:** Model Edition z relacją 1:N do Article, automatyczne tworzenie via cron job
**Konsekwencje:**
- Artykuły grupowane po dacie publikacji/pobrania
- TTS playlist dla wydania — osobne audio per artykuł via POST /api/tts,
  sekwencyjne generowanie z prefetch, nawigacja prev/next,
  cache blob URL per track
- Cron job `/api/cron/editions` do automatycznego tworzenia

### ADR-007: PWA (Progressive Web App)
**Status:** Accepted (Implemented v2.8.0)
**Kontekst:** Mobile-first UX, instalacja na home screen, offline basic support
**Decyzja:** Web App Manifest + Service Worker z cache strategią
**Konsekwencje:**
- Manifest z ikonami 192/512, theme color
- Service worker: cache-first dla statycznych zasobów, network-first dla API
- Offline fallback page
- Przyszłość: Media Session API dla lockscreen controls, background audio

### ADR-008: SSE for Scraping Progress
**Status:** Accepted (Implemented v2.8.0)
**Kontekst:** Scraping wielu źródeł trwa długo, użytkownik potrzebuje feedback
**Decyzja:** Server-Sent Events (SSE) via `GET /api/scrape/all`
**Konsekwencje:**
- Real-time progress per source (status, current/total)
- Automatyczne tworzenie wydania po zakończeniu sync
- UI: SyncProgressModal z logami na żywo

### ADR-009: Dual-Language Connector Architecture
**Status:** Accepted
**Kontekst:** Gmail ma oficjalne SDK dla Node.js (`googleapis`), ale LinkedIn i X/Twitter wymagają nieoficjalnych bibliotek dostępnych tylko w Pythonie (`linkedin-api`, `twikit`)
**Decyzja:** Gmail connector w Node.js (blisko Next.js API routes), LinkedIn + X/Twitter w Python microservice (rozszerzenie istniejącego `scraper/`)
**Konsekwencje:**
- Gmail: `googleapis` + `google-auth-library` w `package.json`
- LinkedIn: `linkedin-api` w `scraper/requirements.txt`, endpointy `POST /linkedin/search-profiles`, `POST /linkedin/profile-posts`
- X/Twitter: `twikit` w `scraper/requirements.txt`, endpoint `POST /scrape/twitter/timeline`
- Node.js backend komunikuje się z Python microservice przez HTTP (localhost:8000)
- Wspólny `SourceConnector` interface w Node.js, LinkedIn/Twitter connectors delegują do Python

### ADR-010: Gmail Precise Import (3 Paths)
**Status:** Accepted
**Kontekst:** PO odrzucił auto-detekcję newsletterów. Użytkownik chce precyzyjnie wskazać co importować
**Decyzja:** 3 ścieżki dodawania nadawców: Paste & Match (primary), LLM Search, Browse & Select
**Konsekwencje:**
- Domyślnie NIC nie jest importowane - pełna kontrola użytkownika
- LLM (istniejący PAL z aiService.ts) konwertuje intencje na Gmail query
- `List-Unsubscribe` header jako sygnał pomocniczy (nie trigger importu)
- Config schema: `senders[]` z email, name, matchQuery (bez labels)
- Gmail wizard UI z 3 zakładkami (mockup: `ui_gmail_wizard_v2_1.html`)

### ADR-011: Q&A Agent Architecture (Planned)
**Status:** Proposed
**Kontekst:** Ewolucja z pasywnego readera w konwersacyjnego agenta newsowego
**Decyzja:** Context stuffing (nie vector DB), provider-agnostic LLM, SSE streaming odpowiedzi
**Konsekwencje:**
- Single-article Q&A: kontekst = article content + intro + summary
- Multi-article Q&A (Premium): context z wielu artykułów z limitem tokenów
- Provider Abstraction Layer: unified interface LLM/TTS/STT
- Feature flags dla OSS vs Premium boundary (nie repo split)
- Conversation history in-memory (nie persisted w MVP)

---

## 10. Ryzyka

| Ryzyko | Prawdopodobieństwo | Impact | Mitygacja |
|--------|-------------------|--------|-----------|
| Blokada scraping przez strony | Średnie | Wysoki | Rotacja User-Agent, delays |
| Koszty LLM API (provider-agnostic) | Niskie | Średni | Cache streszczeń, limity |
| LinkedIn ban konta (Voyager API) | Wysokie (~23%) | Średni | Disclaimer dla usera, manual cookie fallback, rate limiting 120min |
| X/Twitter ban konta (Twikit) | Średnie | Średni | Cookies auth (stabilniejsze), rate limit 600/15min, disclaimer |
| Voyager API zmiana endpointów | Wysokie | Średni | linkedin-api jako wrapper (aktualizacje), fallback na manual cookies |
| Google OAuth token expiry | Niskie | Niski | Auto-refresh, notyfikacja re-auth w UI |
| Oracle Cloud EOL Free Tier | Niskie | Wysoki | Backup strategia (VPS) |

---

## 11. Następne Kroki

1. ✅ HLD (ten dokument)
2. ⏳ LLD - szczegółowy design (schema DB, API endpoints)
3. ⏳ Setup projektu
4. ⏳ Implementacja MVP
