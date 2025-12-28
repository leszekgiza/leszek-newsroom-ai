# Leszek Newsroom AI - High-Level Design (HLD)

**Wersja:** 1.1
**Data:** 2025-12-28
**Status:** Draft

---

## 1. Przegląd Systemu

### 1.1 Cel
System agregacji treści z wielu źródeł internetowych z automatycznym generowaniem streszczeń AI i funkcją Text-to-Speech.

### 1.2 Główne Funkcje
- Scraping artykułów ze stron internetowych
- Generowanie 2-zdaniowych intro i pełnych streszczeń (Claude AI)
- Text-to-Speech dla streszczeń (Edge TTS)
- Wyszukiwanie full-text w języku polskim (PostgreSQL FTS)
- Integracje: Gmail (newslettery), LinkedIn (posty)
- Autentykacja użytkowników

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
│  • Gmail: OAuth, newslettery z wybranych nadawców               │
│  • LinkedIn: li_at cookie, hashtagi, obserwowani eksperci       │
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
│                    (Przeglądarka / Mobile)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEWSROOM AI SYSTEM                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Frontend   │  │   Backend   │  │  Scraper    │              │
│  │  (Next.js)  │◄─┤  (Node.js)  │◄─┤ (Crawl4AI)  │              │
│  └─────────────┘  └──────┬──────┘  └─────────────┘              │
│                          │                                       │
│                   ┌──────▼──────┐                                │
│                   │ PostgreSQL  │                                │
│                   └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                      │         │         │
          ┌───────────┘         │         └───────────┐
          ▼                     ▼                     ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │ Claude AI │        │  Gmail    │        │ LinkedIn  │
    │   (API)   │        │  (OAuth)  │        │  (Scrape) │
    └───────────┘        └───────────┘        └───────────┘
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
│  │ /settings    │  │ TTSPlayer    │  │ useSearch    │  │            │ │
│  │ /login       │  │ SearchBar    │  │ useSources   │  │            │ │
│  │ /register    │  │ SourceFilter │  │              │  │            │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API / Server Actions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node.js)                             │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │     API      │  │   Services   │  │    Jobs      │  │   Utils    │ │
│  │   Routes     │  │              │  │  (Scheduled) │  │            │ │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├────────────┤ │
│  │ /articles    │  │ ArticleSvc   │  │ ScrapeJob    │  │ encryption │ │
│  │ /sources     │  │ ScrapeSvc    │  │ SummaryJob   │  │ auth       │ │
│  │ /auth        │  │ SummarySvc   │  │ GmailSyncJob │  │ validators │ │
│  │ /search      │  │ TTSSvc       │  │              │  │            │ │
│  │ /saved       │  │ SearchSvc    │  │              │  │            │ │
│  │ /tts         │  │ GmailSvc     │  │              │  │            │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                    │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │         PostgreSQL              │  │        File Storage          │ │
│  ├─────────────────────────────────┤  ├──────────────────────────────┤ │
│  │ users                           │  │ /audio (TTS cache)           │ │
│  │ articles                        │  │                              │ │
│  │ sources                         │  │                              │ │
│  │ saved_articles                  │  │                              │ │
│  │ integrations                    │  │                              │ │
│  │ sessions                        │  │                              │ │
│  └─────────────────────────────────┘  └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Crawl4AI    │  │  Claude API  │  │   Edge TTS   │  │   Gmail    │ │
│  │  (Docker)    │  │  (Anthropic) │  │  (Microsoft) │  │   (OAuth)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Technologiczny

### 3.1 Frontend
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Framework | Next.js 14+ (App Router) | SSR, Server Actions, dobry DX |
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
| Auth | NextAuth.js | Sesje, OAuth gotowe |
| Jobs | node-cron | Proste scheduled tasks |
| Validation | Zod | Współdzielone z frontendem |

### 3.3 Scraping
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Engine | Crawl4AI | Open source, LLM-ready output |
| Runtime | Python 3.11+ (Docker) | Wymagane przez Crawl4AI |
| Browser | Playwright | JS rendering, login support |

### 3.4 AI & TTS
| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| LLM | Claude 3.5 Sonnet | Jakość streszczeń, polski |
| TTS | Edge TTS | Darmowe, polski głos |

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

### 4.3 TTS Flow

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
- **At Rest:** AES-256 dla credentials stron zewnętrznych
- **Klucze:** Przechowywane w env vars

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
**Decyzja:** Next.js 14+ z App Router
**Konsekwencje:** Jeden codebase, Server Actions, dobre SEO

### ADR-003: PostgreSQL FTS zamiast Elasticsearch
**Status:** Accepted
**Kontekst:** Wyszukiwanie w języku polskim
**Decyzja:** PostgreSQL Full-Text Search z konfiguracją `polish`
**Konsekwencje:** Brak dodatkowej infrastruktury, wystarczająca wydajność dla MVP

### ADR-004: Edge TTS zamiast płatnych rozwiązań
**Status:** Accepted
**Kontekst:** TTS dla streszczeń
**Decyzja:** Microsoft Edge TTS (darmowe)
**Konsekwencje:** Dobra jakość polskiego głosu, zero kosztów

---

## 10. Ryzyka

| Ryzyko | Prawdopodobieństwo | Impact | Mitygacja |
|--------|-------------------|--------|-----------|
| Blokada scraping przez strony | Średnie | Wysoki | Rotacja User-Agent, delays |
| Koszty Claude API | Niskie | Średni | Cache streszczeń, limity |
| LinkedIn blokuje li_at | Wysokie | Średni | Fallback, instrukcja dla usera |
| Oracle Cloud EOL Free Tier | Niskie | Wysoki | Backup strategia (VPS) |

---

## 11. Następne Kroki

1. ✅ HLD (ten dokument)
2. ⏳ LLD - szczegółowy design (schema DB, API endpoints)
3. ⏳ Setup projektu
4. ⏳ Implementacja MVP
