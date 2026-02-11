# Brief dla BMAD: Source Integrations (Gmail + LinkedIn + X)

**Data:** 2026-02-09
**Przygotował:** Claude Code (na zlecenie PO)
**Dla:** Mary (BA) → Bob (Sprint Planning) → Winston (Architect) → Amelia (Dev) → Quinn (QA)

---

## 1. Decyzja PO

Product Owner zmienił priorytety. Source Integrations (Gmail, LinkedIn, X/Twitter) to teraz **priorytet #1**, przed Q&A, Dark Mode i innymi funkcjami.

**Cel biznesowy:** Użytkownik chce agregować treści nie tylko ze stron WWW, ale też z:
- **Newsletterów mailowych** (Gmail)
- **Walla/feeda LinkedIn** (posty ekspertów, hashtagi)
- **Feeda X/Twitter** (timeline użytkownika)

---

## 2. Stan projektu (as-built)

### Co już jest:
- **Model danych** gotowy - Prisma enum `PrivateSourceType` ma typy: `WEBSITE`, `GMAIL`, `LINKEDIN`, `TWITTER`, `RSS`
- **PrivateSource** model z polami: `config` (JSON), `credentials` (String, nullable), `isActive`, `lastScrapedAt`
- **Scraping pipeline** działa dla WEBSITE: scrapeArticlesList → scrapeUrl → extractIntro → generatePolishIntro → addArticleToEdition
- **Pattern matching** dla URL-based sources (includePatterns, excludePatterns)
- **Provider Abstraction Layer** (PAL) ukończony - interfejsy LLM i TTS z factory pattern
- **Crawl4AI microservice** (Python/FastAPI) do scrapingu WWW

### Czego brakuje:
- Brak connectorów dla GMAIL, LINKEDIN, TWITTER
- Brak szyfrowania credentials (TODO w kodzie, linia 82 private sources route)
- Brak OAuth flow (Google)
- Brak connector interface/registry
- Brak UI wizardów do konfiguracji źródeł social/mail

---

## 3. Decyzje PO dot. podejścia technicznego

| Źródło | Podejście zatwierdzone przez PO |
|--------|--------------------------------|
| **Gmail** | Google OAuth 2.0 + Gmail API (login na dane użytkownika, to jego Gmail) |
| **LinkedIn** | Login/hasło użytkownika + API/scraping |
| **X/Twitter** | Scraping (nie oficjalne API) |

---

## 4. Research techniczny (wstępny)

### Gmail
- **Google OAuth 2.0** z scope `gmail.readonly` - darmowe w ramach quota
- **Flow:** OAuth consent → callback → refresh_token → Gmail API → search emails → parse MIME HTML → extract content
- **Config per source:** senders (lista nadawców), labels, maxAge (dni wstecz)
- **Wymagania:** Google Cloud Console project, OAuth consent screen, redirect URI
- **Feasibility:** WYSOKA

### LinkedIn
- **Oficjalne API** wymaga partnerstwa LinkedIn - niedostępne dla małych projektów
- **Alternatywa:** Login/hasło → session cookie (li_at) → scraping feed HTML
- **Config per source:** hashtags, followed authors, max posts
- **Ryzyko:** LinkedIn aktywnie banuje scraping. Wymaga disclaimera w UI
- **Feasibility:** ŚREDNIA

### X/Twitter
- **Oficjalne API:** Płatne od $200/mies (Basic), scraping jest tańszy
- **Podejście PO:** Scraping via Playwright (headless browser)
- **Config per source:** lists, max tweets, include/exclude retweets
- **Ryzyko:** Anti-bot zabezpieczenia, guest tokens expire co 2-4 tyg., datacenter IP banowane
- **Feasibility:** ŚREDNIA

---

## 5. Istniejąca architektura (kluczowe pliki)

| Plik | Opis | Znaczenie dla integracji |
|------|------|--------------------------|
| `prisma/schema.prisma` | Model PrivateSource + enum PrivateSourceType | Gotowy model, typy GMAIL/LINKEDIN/TWITTER zdefiniowane |
| `src/lib/scrapeService.ts` | Scraping pipeline (Crawl4AI) | Wzorzec do naśladowania dla connectorów |
| `src/lib/patternUtils.ts` | URL pattern matching | Reuse dla URL-based filtering |
| `src/lib/aiService.ts` | generatePolishIntro() | Generowanie intro dla nowych artykułów |
| `src/lib/editionService.ts` | addArticleToEdition() | Integracja artykułów z wydaniami |
| `src/app/api/sources/private/` | CRUD API routes | Rozszerzenie o auth/config per connector |
| `src/lib/ai/llm.ts` | LLM Provider interface (PAL) | Wzorzec factory pattern do reuse |
| `src/lib/config.ts` | Centralna konfiguracja | Rozszerzenie o connector config |
| `scraper/main.py` | Python Crawl4AI microservice | Potencjalnie rozszerzenie o LinkedIn/X scraping |

---

## 6. Backlog (zaktualizowany)

Nowe epiki w `docs/backlog.md` na pozycji #1:
- **CONN.1-4** - Connector infrastructure (interface, encryption, health, scheduler)
- **GMAIL.1-5** - Gmail connector (OAuth, API client, parser, connector, UI wizard)
- **LNKD.1-5** - LinkedIn connector (auth, scraper, parser, connector, UI wizard)
- **XTWT.1-5** - X/Twitter connector (auth, scraper, parser, connector, UI wizard)

---

## 7. Pytania otwarte dla BMAD

### Dla Mary (BA):
1. Czy użytkownik powinien móc konfigurować filtrowanie newsletterów (po nadawcy, etykiecie, słowach kluczowych)?
2. Jak obsługiwać expired credentials? (notyfikacja, auto-retry, re-auth prompt?)
3. Czy LinkedIn scraping powinien mieć disclaimer o ryzyku bana konta?
4. Czy X/Twitter ma obsługiwać tylko timeline czy też listy i wyszukiwanie?
5. Jaki jest akceptowalny interwał odświeżania per connector? (co 15 min, co 1h, manual?)

### Dla Winstona (Architect):
1. Connector interface - czy wzorować na PAL (factory pattern) czy osobna architektura?
2. Scraping LinkedIn/X - w Node.js (Playwright) czy rozszerzenie Python microservice (Crawl4AI)?
3. Credential encryption - AES-256 z env key czy zewnętrzny secret manager?
4. OAuth tokens - gdzie przechowywać? (DB encrypted vs keychain vs env)

### Dla Quinn (QA):
1. Jak testować OAuth flow bez prawdziwego konta Google?
2. Jak testować scraping LinkedIn/X bez ryzyka bana?
3. Czy potrzebujemy mock connectorów do E2E testów?

---

## 8. Dokumentacja do zaktualizowania (po analizie BMAD)

| Dokument | Co zaktualizować |
|----------|-----------------|
| `docs/requirements.md` | Szczegółowe wymagania F1.2, F1.3, F1.4 (po analizie Mary) |
| `docs/user-stories.md` | Nowe user stories dla Gmail/LinkedIn/X |
| `docs/hld.md` | Architektura connectorów (po decyzji Winstona) |
| `docs/lld.md` | Szczegóły implementacji (po decyzji Winstona) |
| `docs/backlog.md` | Estymaty i zależności (po planowaniu Boba) |
