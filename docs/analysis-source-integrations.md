# Analiza wymagań: Source Integrations (Gmail + LinkedIn + X/Twitter)

**Autor:** Mary (Business Analyst, BMAD)
**Wersja:** 2.0
**Data:** 2026-02-09
**Status:** v2.0 (po review PO)

---

## 1. Podsumowanie wykonawcze

Product Owner zmienił priorytety projektu. Integracje źródeł treści (Gmail, LinkedIn, X/Twitter) stają się priorytetem #1, przed Q&A, Dark Mode i innymi funkcjami.

**Problem biznesowy:** Użytkownicy śledzą treści w wielu kanałach jednocześnie - blogi, newslettery mailowe, LinkedIn, X/Twitter. Przełączanie między aplikacjami jest czasochłonne i prowadzi do przegapiania ważnych informacji.

**Rozwiązanie:** Agregacja treści z Gmail (newslettery), LinkedIn (feed/wall) i X/Twitter (timeline) w jednym miejscu, z AI streszczeniami i TTS, identycznie jak dla artykułów ze stron WWW.

**Wartość dla użytkownika:** Jedno miejsce do konsumpcji wszystkich źródeł informacji, z oszczędnością czasu dzięki AI streszczeniom i TTS.

### Zmiany w v2.0 (po feedbacku PO)

| # | Feedback PO | Zmiana |
|---|-------------|--------|
| 1 | Gmail: precyzyjny import, NIE auto-detekcja | Przebudowana sekcja 4.1 - 3 ścieżki dodawania (Paste & Match / LLM Search / Browse & Select) |
| 2 | Gmail: LLM do wyszukiwania pasujących maili | Ścieżka B z konwersją intencji na Gmail query |
| 3 | Gmail: domyślnie NIC nie importowane | Użytkownik sam zaznacza nadawców we wszystkich ścieżkach |
| 4 | LinkedIn: scraping OK (Voyager API / cookies) | Sekcja 4.2 - Voyager API + linkedin-api (Python) |
| 5 | X/Twitter: Twikit zamiast Playwright | Sekcja 4.3 - Twikit (Python, async) |
| 6 | UX/UI: potrzebna Sally do mocków | Nowa sekcja 8 - wymagania dla Sally |
| 7 | User Stories: bardziej szczegółowe | Sekcja 6 - rozszerzone opisy i AC |
| 8 | Zależności: Python microservice dla LinkedIn/X | Sekcja 5 - architektura dwujęzyczna (Node.js + Python) |

---

## 2. Zakres analizy

### 2.1 W zakresie (In Scope)
- Gmail: precyzyjny import wskazanych maili (OAuth + LLM matching)
- LinkedIn: odczytywanie feeda/walla użytkownika (login/cookies + Voyager API/scraping, za zgodą PO)
- X/Twitter: odczytywanie timeline'u użytkownika (cookies + Twikit, Python)
- Infrastruktura connectorów (wspólny interfejs, szyfrowanie credentials)
- UI wizardy konfiguracji per connector
- Integracja z istniejącym pipeline'em (AI intro, summary, TTS, editions)

### 2.2 Poza zakresem (Out of Scope)
- STT / Voice Input (osobny epic)
- Multi-Article Q&A (osobny epic)
- Topic-based discovery (v3.0)
- Managed connectors (Premium) - obecna implementacja to BYO credentials (OSS)

---

## 3. Analiza interesariuszy

| Interesariusz | Potrzeba | Priorytet |
|---------------|----------|-----------|
| **Użytkownik końcowy** | Czytać newslettery, posty LinkedIn, tweety w jednym miejscu | Krytyczny |
| **PO** | Rozszerzenie value proposition, więcej źródeł = więcej wartości | Krytyczny |
| **Developer (Amelia)** | Czysty interfejs connectorów, reuse istniejącego pipeline | Wysoki |
| **QA (Quinn)** | Testowalność integracji bez ryzyka bana kont | Wysoki |

---

## 4. Szczegółowa analiza per connector

### 4.1 Gmail Connector (precyzyjny import newsletterów)

#### 4.1.1 Opis funkcjonalny

Użytkownik łączy swoje konto Gmail przez OAuth 2.0. System **NIE importuje niczego automatycznie**. Użytkownik sam decyduje które maile importować, korzystając z jednej z trzech ścieżek:
- **Ścieżka A: Wklej nadawcę** (Paste & Match) - najczęstszy przypadek
- **Ścieżka B: Wyszukaj** (LLM-assisted search) - opisz co szukasz
- **Ścieżka C: Przeglądaj skrzynkę** (Browse & Select) - discovery mode

LLM pomaga wyszukać i dopasować maile do intencji użytkownika, ale **decyzja o imporcie zawsze należy do użytkownika**.

#### 4.1.2 Badanie rynku

Przeanalizowano 11 aplikacji: Meco, Readwise Reader, Stoop, Superhuman, Unroll.me, Feedbin, Kill the Newsletter, RSS.app, Readless, Feedly, Inoreader.

Zidentyfikowano 5 wzorców UX:

| Wzorzec | Ease | Precision | Complexity | User Effort | LLM Value | Score |
|---------|------|-----------|------------|-------------|-----------|-------|
| **A: Paste & Match** | 4/5 | 5/5 | 2/5 | 3/5 | 4/5 | **18** |
| B: Forward One | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 17 |
| **C: Browse & Select** | 5/5 | 4/5 | 3/5 | 2/5 | 5/5 | **19** |
| D: Natural Language Rule | 4/5 | 3/5 | 3/5 | 3/5 | 5/5 | 18 |
| E: Unique Inbox | 2/5 | 5/5 | 4/5 | 5/5 | 2/5 | 18 |

**Rekomendacja:** Hybrid - "Paste & Match" (primary) + "Browse & Select" (discovery) + Natural Language enhancement (Ścieżka B).

**Kluczowe odkrycia techniczne:**
- `List-Unsubscribe` header: darmowa heurystyka (obowiązkowy od 2024), ale **tylko jako sygnał posiłkowy, nie jako trigger importu**
- Gmail `label:^unsub`: ukryty operator wykrywający bulk maile
- Gmail API query `from:X newer_than:30d` - proste wyszukiwanie po nadawcy
- Inbox Zero (open source, Next.js) - referencyjny projekt z Gmail + LLM

#### 4.1.3 Flow użytkownika (3 ścieżki dodawania źródła)

**Ścieżka A: "Wklej nadawcę" (primary - najczęstszy przypadek)**
```
1. "Dodaj Gmail" → OAuth consent → akceptacja gmail.readonly
2. Użytkownik wpisuje adres nadawcy (np. newsletter@deeplearning.ai)
3. System wyszukuje maile od tego nadawcy (Gmail API: from:X newer_than:30d)
4. Pokazuje podgląd: nazwa, ostatni temat, częstotliwość, liczba maili
5. Użytkownik potwierdza → PrivateSource(type=GMAIL, config.senders[])
```

**Ścieżka B: "Opisz co szukasz" (LLM-assisted search)**
```
1. Po połączeniu Gmail, użytkownik wpisuje opis:
   np. "newslettery o AI od deeplearning.ai"
   lub "cotygodniowe podsumowania technologiczne"
2. LLM konwertuje na Gmail query:
   → from:deeplearning.ai subject:(AI OR "machine learning")
   → subject:("weekly digest" OR "weekly roundup") newer_than:90d
3. System pokazuje wyniki pogrupowane po nadawcy
4. Użytkownik przechodzi do listy nadawców → zaznacza które importować
5. Zapisz → PrivateSource(type=GMAIL)
```

**Ścieżka C: "Przeglądaj skrzynkę" (Browse & Select - discovery)**
```
1. Po połączeniu Gmail, użytkownik klika "Przeglądaj skrzynkę"
2. System skanuje ostatnie 30 dni, grupuje po nadawcy
3. LLM pre-klasyfikuje nadawców:
   - Newsletter (warty czytania)
   - Marketing/Promo (oznaczony ⚠)
   - Transakcyjny (ukryty domyślnie)
   - Osobisty (ukryty domyślnie)
4. Użytkownik przechodzi po liście nadawców
5. NICZEGO nie zaznacza domyślnie - użytkownik sam klika
6. Zapisz wybrane → PrivateSource(type=GMAIL)
```

#### 4.1.4 Wireframe wizardu Gmail (ASCII)

```
+--------------------------------------------------------------+
| Dodaj źródło Gmail                                           |
|                                                              |
| [Wklej nadawcę] [Wyszukaj] [Przeglądaj skrzynkę]           |
|                                                              |
| --- Tab: Wklej nadawcę ---                                   |
| Adres email nadawcy:                                         |
| [newsletter@deeplearning.ai          ] [Szukaj]              |
|                                                              |
| Znaleziono: The Batch (DeepLearning.AI)                      |
| Ostatni: "What's new in ML this week" (3 dni temu)           |
| Częstotliwość: co tydzień · 24 emaile w 30 dni              |
|                                [Dodaj do importu]            |
|                                                              |
| --- Tab: Wyszukaj (LLM) ---                                 |
| Opisz jakie maile chcesz importować:                         |
| [cotygodniowe newslettery o AI i ML            ] [Szukaj]    |
|                                                              |
| Znalezione dopasowania:                                      |
| [ ] The Batch - newsletter@deeplearning.ai (24 maile)        |
| [ ] TLDR AI - dan@tldrnewsletter.com (30 maili)             |
| [ ] One Useful Thing - ethan@substack.com (12 maili)         |
| [ ] Import AI - jack@importai.net (4 maile)                  |
|                                                              |
| --- Tab: Przeglądaj skrzynkę ---                             |
| LLM pre-klasyfikacja: Newsletter | Marketing | Wszystkie     |
|                                                              |
| [ ] The Batch - DeepLearning.AI          Co tydz · 24       |
| [ ] One Useful Thing - Ethan Mollick     Co tydz · 12       |
| [ ] Amazon Marketing ⚠                  Codziennie · 156   |
|                                                              |
| --- Dodane źródła (0) ---                                    |
| Brak. Wybierz nadawców powyżej.                              |
|                                                              |
|                    [Anuluj]  [Zapisz]                        |
+--------------------------------------------------------------+
```

#### 4.1.5 Config schema (PrivateSource.config)
```json
{
  "senders": [
    {
      "email": "newsletter@deeplearning.ai",
      "name": "The Batch",
      "lastSubject": "What's new in ML this week",
      "matchQuery": "from:newsletter@deeplearning.ai"
    }
  ],
  "maxAgeDays": 7,
  "syncInterval": 60,
  "lastSyncMessageId": "18d4f5a2b3c4d5e6"
}
```

> **Usunięte z v1.0:** pole `labels` (za skomplikowane dla użytkownika, nie pasuje do nowego modelu precyzyjnego importu).

#### 4.1.6 Credentials (PrivateSource.credentials) - encrypted
```json
{
  "accessToken": "ya29...",
  "refreshToken": "1//0g...",
  "tokenExpiry": "2026-02-09T15:00:00Z",
  "email": "user@gmail.com"
}
```

#### 4.1.7 Kryteria akceptacji
- [ ] AC1: Użytkownik może połączyć konto Gmail przez OAuth (Google consent screen)
- [ ] AC2: System pozwala wyszukać nadawców po adresie email (Ścieżka A: Paste & Match)
- [ ] AC3: System pozwala opisać co szukasz - LLM generuje Gmail query (Ścieżka B: Natural Language)
- [ ] AC4: System pozwala przeglądać skrzynkę pogrupowaną po nadawcach (Ścieżka C: Browse & Select)
- [ ] AC5: LLM klasyfikuje nadawców jako: newsletter / marketing / transakcyjny / osobisty
- [ ] AC6: Podgląd nadawcy: nazwa, email, ostatni temat, częstotliwość, liczba maili
- [ ] AC7: Domyślnie NIC nie jest zaznaczone - użytkownik sam wybiera
- [ ] AC8: Email HTML jest konwertowany na czysty tekst/markdown (usunięcie reklam, stopek, tracking pixels)
- [ ] AC9: Każdy email staje się Article z intro (AI) i jest dodany do Edition
- [ ] AC10: Refresh token jest przechowywany zaszyfrowany (AES-256)
- [ ] AC11: Gdy token wygaśnie, system automatycznie odświeża go przez refresh_token
- [ ] AC12: Gdy refresh_token jest invalid, użytkownik widzi powiadomienie "Połącz ponownie Gmail"
- [ ] AC13: Użytkownik może rozłączyć Gmail (usunięcie tokena i źródła)
- [ ] AC14: Deduplikacja - ten sam email nie jest importowany dwukrotnie (Message-ID)
- [ ] AC_fallback: Ręczne dodanie adresu nadawcy (bez skanowania) jako fallback

#### 4.1.8 Wymagania techniczne
- Google Cloud Console: projekt z włączonym Gmail API
- OAuth 2.0 scope: `https://www.googleapis.com/auth/gmail.readonly`
- Redirect URI: `/api/auth/google/callback`
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

#### 4.1.9 Ryzyka
| Ryzyko | Prawdop. | Impact | Mitygacja |
|--------|----------|--------|-----------|
| Google verification process (OAuth consent) | Średnie | Wysoki | Tryb testowy (100 userów) lub pełna weryfikacja |
| Rate limit Gmail API | Niskie | Niski | Quota 1B units/day - wystarczający |
| Złożoność parsowania HTML emaili | Wysokie | Średni | Biblioteka cheerio + dedykowany parser |
| LLM hallucynuje Gmail query | Średnie | Niski | Walidacja query przed wykonaniem, fallback na proste `from:X` |

---

### 4.2 LinkedIn Connector (wall/feed)

#### 4.2.1 Opis funkcjonalny

Logowanie na konto LinkedIn → scraping walla/feeda. Użycie Voyager API (`linkedin-api` Python) lub bezpośredni scraping z session cookies.

> **Nota o braku oficjalnego API:**
> Oficjalne LinkedIn API nie daje dostępu do feeda użytkownika. Uprawnienie `r_member_social` zostało zamknięte w czerwcu 2023. Używamy nieoficjalnego Voyager API z pełną świadomością ryzyka (ban konta, naruszenie ToS). Użytkownik musi zaakceptować disclaimer.

#### 4.2.2 Flow użytkownika
```
1. "Dodaj LinkedIn" → disclaimer o ryzyku
2. Podaj login/hasło LinkedIn
3. System loguje się → Voyager API lub cookies
4. System pobiera feed → parsuje posty
5. Konfiguracja filtrów (hashtagi, autorzy, max postów)
6. Zapisz → PrivateSource(type=LINKEDIN)
```

#### 4.2.3 Config schema (PrivateSource.config)
```json
{
  "hashtags": ["#AI", "#MachineLearning", "#LLM"],
  "followedAuthors": [
    { "name": "Andrej Karpathy", "profileUrl": "https://linkedin.com/in/karpathy" }
  ],
  "maxPosts": 30,
  "syncInterval": 120,
  "includeReposts": false,
  "minContentLength": 100
}
```

#### 4.2.4 Credentials (PrivateSource.credentials) - encrypted
```json
{
  "username": "user@email.com",
  "password": "encrypted_password",
  "cookies": {
    "li_at": "AQE...",
    "JSESSIONID": "ajax:...",
    "expiresAt": "2026-03-09T00:00:00Z"
  }
}
```

#### 4.2.5 Kryteria akceptacji
- [ ] AC1: Użytkownik widzi disclaimer o ryzyku scrapingu przed podaniem credentials
- [ ] AC2: Użytkownik musi zaznaczyć checkbox akceptacji ryzyka
- [ ] AC3: System loguje się na LinkedIn z podanymi credentials (Voyager API)
- [ ] AC4: Session cookies (li_at) są przechowywane zaszyfrowane (AES-256)
- [ ] AC5: Login i hasło są przechowywane zaszyfrowane (AES-256)
- [ ] AC6: System pobiera posty z feeda użytkownika (max 30 domyślnie)
- [ ] AC7: Posty są filtrowane po hashtagach i/lub autorach (jeśli skonfigurowane)
- [ ] AC8: Każdy post staje się Article z intro (AI) i jest dodany do Edition
- [ ] AC9: Post content (tekst + linki) jest konwertowany na markdown
- [ ] AC10: Reposts/udostępnienia są opcjonalnie włączane/wyłączane
- [ ] AC11: Gdy cookie wygaśnie, system próbuje re-login; jeśli 2FA → notyfikacja
- [ ] AC12: Użytkownik może rozłączyć LinkedIn (usunięcie credentials i źródła)
- [ ] AC13: Rate limiting: max 1 request/5 sekund do LinkedIn

#### 4.2.6 Wymagania techniczne
- `linkedin-api` (Python PyPI) - Voyager API client
- Alternatywnie: bezpośredni HTTP + cookies (li_at, JSESSIONID)
- Integracja przez istniejący Python microservice (scraper/)
- Nowy endpoint: `POST /scrape/linkedin/feed`
- Session cookie refresh mechanism

#### 4.2.7 Ryzyka
| Ryzyko | Prawdop. | Impact | Mitygacja |
|--------|----------|--------|-----------|
| Ban konta LinkedIn za scraping | Wysokie (~23%) | Wysoki | Rate limiting, human-like delays, disclaimer |
| Precedens prawny (Proxycurl zamknięty 2026) | Niskie | Wysoki | BYO credentials, personal use only, user consent |
| Voyager API: nieudokumentowane, niestabilne | Wysokie | Średni | Modular parser, szybki fix, fallback na HTTP+cookies |
| 2FA/CAPTCHA blokuje auto-login | Średnie | Wysoki | Manual cookie input jako fallback |
| ToS violation - konsekwencje prawne | Niskie | Wysoki | BYO credentials, user consent, personal use only |

---

### 4.3 X/Twitter Connector (timeline)

#### 4.3.1 Opis funkcjonalny

Scraping timeline'u X/Twitter przez **Twikit** (Python, async). Użytkownik podaje cookies z przeglądarki (preferowane) lub login/hasło.

#### 4.3.2 Flow użytkownika
```
1. "Dodaj X/Twitter" → disclaimer o ryzyku
2. Podaj cookies (auth_token, ct0) z przeglądarki
   LUB login/hasło (mniej stabilne)
3. System łączy się przez Twikit → pobiera timeline
4. Konfiguracja: typ timeline, max tweetów, retweets, replies
5. Zapisz → PrivateSource(type=TWITTER)
```

#### 4.3.3 Config schema (PrivateSource.config)
```json
{
  "timelineType": "following",
  "lists": [],
  "maxTweets": 50,
  "syncInterval": 180,
  "includeRetweets": false,
  "includeReplies": false,
  "expandThreads": true,
  "minLikes": 0
}
```

#### 4.3.4 Credentials (PrivateSource.credentials) - encrypted
```json
{
  "username": "@user",
  "cookies": {
    "auth_token": "...",
    "ct0": "...",
    "expiresAt": "2026-03-09T00:00:00Z"
  }
}
```

> **Usunięte z v1.0:** pole `password` - cookies są preferowaną metodą auth, login/hasło jako fallback.

#### 4.3.5 Kryteria akceptacji
- [ ] AC1: Użytkownik widzi disclaimer o ryzyku scrapingu i anty-bot zabezpieczeniach
- [ ] AC2: Użytkownik musi zaznaczyć checkbox akceptacji ryzyka
- [ ] AC3: System łączy się z X/Twitter przez Twikit (Python, async)
- [ ] AC4: Session cookies są przechowywane zaszyfrowane (AES-256)
- [ ] AC5: System pobiera timeline użytkownika (max 50 tweetów domyślnie)
- [ ] AC6: Tweety z wątkami (threads) są rozwijane do pełnej treści
- [ ] AC7: Każdy tweet/wątek staje się Article z intro (AI) i jest dodany do Edition
- [ ] AC8: Tweet content (tekst + linki + media URLs) jest konwertowany na markdown
- [ ] AC9: Retweets i replies są opcjonalnie włączane/wyłączane
- [ ] AC10: Gdy cookies wygasną, system próbuje re-login; jeśli zablokowany → notyfikacja
- [ ] AC11: Użytkownik może rozłączyć X/Twitter (usunięcie credentials i źródła)
- [ ] AC12: Rate limiting: 600 tweetów/15 min per konto
- [ ] AC13: System obsługuje graceful degradation gdy anti-bot blokuje

#### 4.3.6 Wymagania techniczne
- `twikit` (Python PyPI) - async Twitter scraper
- Auth: cookies (preferowane) lub login/hasło
- Integracja przez istniejący Python microservice (scraper/)
- Nowy endpoint: `POST /scrape/twitter/timeline`
- Rate limit: 600 tweetów/15 min per konto
- Alternatywa: `twscrape` (multi-account rotation)

> **Usunięte z v1.0:** Playwright (Node.js), Nitter, snscrape - zastąpione przez Twikit (Python).

#### 4.3.7 Ryzyka
| Ryzyko | Prawdop. | Impact | Mitygacja |
|--------|----------|--------|-----------|
| Anti-bot zabezpieczenia (fingerprinting) | Wysokie | Wysoki | Cookie-based auth, Twikit async |
| Częste zmiany API X.com | Wysokie | Średni | Twikit community updates, fallback na twscrape |
| Ban konta X za scraping | Średnie | Wysoki | Human-like delays, disclaimer, rate limiting |
| Rate limit (600/15min) | Niskie | Niski | Respektowanie limitów, queue |

---

## 5. Infrastruktura connectorów (cross-cutting)

### 5.1 Architektura dwujęzyczna

| Connector | Język | Uzasadnienie |
|-----------|-------|--------------|
| **Gmail** | Node.js | `googleapis` + `google-auth-library` - blisko Next.js API routes |
| **LinkedIn** | Python | `linkedin-api` (Voyager API) - Python-only library |
| **X/Twitter** | Python | `twikit` (async) - Python-only library |

LinkedIn i X/Twitter działają przez istniejący Python microservice (`scraper/`).

### 5.2 Connector Interface

Każdy connector implementuje wspólny interfejs, analogicznie do PAL (Provider Abstraction Layer):

```
SourceConnector
├── authenticate(credentials) → AuthResult
├── fetchItems(source) → ConnectorItem[]
├── validateConfig(config) → boolean
├── getConnectionStatus(source) → ConnectionStatus
└── disconnect(source) → void
```

### 5.3 Credential Encryption

**Wymaganie:** Wszystkie credentials (tokeny OAuth, hasła, cookies) muszą być szyfrowane at-rest.

- Algorytm: AES-256-GCM
- Klucz: z env var `CREDENTIALS_ENCRYPTION_KEY` (32 bajty)
- Format: `iv:encrypted:authTag` (base64)
- Rotacja klucza: manual (v1), automated (v2)

### 5.4 Connector Health & Status

Każde źródło ma status połączenia widoczny w UI:

| Status | Opis | Kolor |
|--------|------|-------|
| `connected` | Aktywne, ostatni sync OK | Zielony |
| `syncing` | Trwa synchronizacja | Niebieski (pulsujący) |
| `error` | Ostatni sync failed | Czerwony |
| `expired` | Credentials wygasły, wymaga re-auth | Pomarańczowy |
| `disconnected` | Rozłączony przez użytkownika | Szary |

### 5.5 Sync Schedule

| Connector | Domyślny interwał | Min interwał | Uzasadnienie |
|-----------|-------------------|--------------|--------------|
| Gmail | 60 min | 15 min | Newslettery nie są pilne, Gmail quota |
| LinkedIn | 120 min | 60 min | Rate limiting, ryzyko bana |
| X/Twitter | 180 min | 60 min | Anty-bot, ryzyko bana |

### 5.6 Retry Logic

- Max 3 retries per sync
- Exponential backoff: 30s, 2min, 10min
- Po 3 failed retries → status `error` → notyfikacja użytkownika
- Po 24h bez sukcesu → status `expired` → prompt re-auth

### 5.7 Nowe zależności

| Package | Język | Cel | Plik |
|---------|-------|-----|------|
| `googleapis` | Node.js | Gmail API client | package.json |
| `google-auth-library` | Node.js | OAuth 2.0 | package.json |
| `cheerio` | Node.js | HTML parsing emaili | package.json |
| `twikit` | Python | X/Twitter scraper | scraper/requirements.txt |
| `linkedin-api` | Python | LinkedIn Voyager | scraper/requirements.txt |

> **Usunięte z v1.0:** `playwright` (Node.js) - niepotrzebny, LinkedIn/X idą przez Python microservice.

---

## 6. User Stories (nowe/zaktualizowane)

### US14.1 - Połączenie Gmail (OAuth)
**Jako** użytkownik
**Chcę** połączyć moje konto Gmail przez OAuth
**Aby** system mógł wyszukiwać i importować wskazane przeze mnie maile

**Szczegóły:**
- Google OAuth consent screen z scope `gmail.readonly`
- Refresh token przechowywany zaszyfrowany (AES-256)
- Automatyczne odświeżanie access tokena
- Notyfikacja gdy token wygaśnie i wymaga ponownego połączenia

**Kryteria akceptacji:** AC1, AC10-AC13 z sekcji 4.1.7

---

### US14.2 - Konfiguracja nadawców Gmail (3 ścieżki)
**Jako** użytkownik
**Chcę** precyzyjnie wskazać od jakich nadawców importować maile
**Aby** mieć pełną kontrolę nad tym co trafia do mojego feedu

**Szczegóły - 3 ścieżki dodawania:**

**Ścieżka A: Wklej nadawcę (Paste & Match)**
- Użytkownik wpisuje adres email nadawcy
- System wyszukuje maile od tego nadawcy (Gmail API: `from:X newer_than:30d`)
- Podgląd: nazwa, ostatni temat, częstotliwość, liczba maili
- Użytkownik potwierdza → dodaje do listy importu

**Ścieżka B: Wyszukaj (LLM-assisted)**
- Użytkownik opisuje intencję w naturalnym języku (np. "newslettery o AI")
- LLM konwertuje opis na Gmail query
- System pokazuje wyniki pogrupowane po nadawcy
- Użytkownik zaznacza które nadawców importować

**Ścieżka C: Przeglądaj skrzynkę (Browse & Select)**
- System skanuje ostatnie 30 dni, grupuje po nadawcy
- LLM pre-klasyfikuje: newsletter / marketing / transakcyjny / osobisty
- Domyślnie NIC nie zaznaczone
- Użytkownik sam klika które nadawców chce importować

**Fallback:** Ręczne dodanie adresu nadawcy (bez skanowania)

**Kryteria akceptacji:** AC2-AC7, AC14, AC_fallback z sekcji 4.1.7

---

### US14.3 - Połączenie LinkedIn (Voyager API)
**Jako** użytkownik
**Chcę** połączyć LinkedIn
**Aby** widzieć posty ekspertów i tematyczne dyskusje w moim feedzie

**Szczegóły:**
- Login/hasło → Voyager API (linkedin-api Python)
- Disclaimer o braku oficjalnego API i ryzyku bana (użytkownik musi zaakceptować)
- Session cookies przechowywane zaszyfrowane
- Fallback: manual cookie input (li_at z DevTools) gdy 2FA blokuje

**Kryteria akceptacji:** AC1-AC13 z sekcji 4.2.5

---

### US14.4 - Filtrowanie postów LinkedIn
**Jako** użytkownik
**Chcę** filtrować posty LinkedIn po hashtagach i autorach
**Aby** dostawać tylko wartościowe treści, nie cały feed

**Kryteria akceptacji:**
- [ ] Input na hashtagi (multi-tag, np. #AI, #ML)
- [ ] Input na profile autorów do śledzenia
- [ ] Opcja include/exclude reposts
- [ ] Minimalny rozmiar posta (filtr spamu)

---

### US14.5 - Połączenie X/Twitter (Twikit)
**Jako** użytkownik
**Chcę** połączyć X/Twitter
**Aby** widzieć tweety i wątki z mojego timeline'u w feedzie

**Szczegóły:**
- Auth przez cookies (auth_token, ct0) - preferowana metoda
- Alternatywnie: login/hasło (mniej stabilne)
- Twikit (Python, async) jako scraper
- Disclaimer o ryzyku bana i anty-bot zabezpieczeniach
- Rate limit: 600 tweetów/15 min per konto

**Kryteria akceptacji:** AC1-AC13 z sekcji 4.3.5

---

### US14.6 - Status połączeń
**Jako** użytkownik
**Chcę** widzieć status moich połączeń (Gmail, LinkedIn, X)
**Aby** wiedzieć czy synchronizacja działa poprawnie

**Kryteria akceptacji:**
- [ ] W ustawieniach widoczny status per connector (connected/error/expired)
- [ ] Data ostatniej synchronizacji
- [ ] Liczba zaimportowanych artykułów
- [ ] Przycisk "Synchronizuj teraz" (manual sync)
- [ ] Notyfikacja gdy credentials wygasną

---

### US14.7 - Bezpieczeństwo credentials
**Jako** użytkownik
**Chcę** mieć pewność że moje dane logowania są bezpieczne
**Aby** nie bać się podawać credentials do swoich kont

**Kryteria akceptacji:**
- [ ] Credentials szyfrowane AES-256 at-rest
- [ ] Klucz szyfrowania poza bazą danych (env var)
- [ ] Credentials nigdy nie są logowane ani wyświetlane w UI
- [ ] Użytkownik może usunąć credentials w dowolnym momencie
- [ ] Po usunięciu konta, wszystkie credentials są kasowane (cascade delete)

---

## 7. Wpływ na istniejące wymagania (Impact Analysis)

### 7.1 Dokumenty do zaktualizowania

| Dokument | Zmiana | Priorytet |
|----------|--------|-----------|
| `requirements.md` | F1.2, F1.3, F1.4 → MUST/SHOULD (DONE). Dodać F1.10 (connector health), F4.11 (connector wizard) | Wysoki |
| `user-stories.md` | Dodać Epic 14: Source Integrations (US14.1-14.7) | Wysoki |
| `hld.md` | Dodać connector architecture diagram, dwujęzyczna architektura (Node.js + Python) | Średni |
| `lld.md` | Dodać connector interface, config schemas, API endpoints, encryption module | Wysoki |
| `backlog.md` | Już zaktualizowany (CONN, GMAIL, LNKD, XTWT epiki) | DONE |
| `.env.example` | Dodać CREDENTIALS_ENCRYPTION_KEY, GOOGLE_CLIENT_ID/SECRET | Wysoki |

### 7.2 Wpływ na istniejący kod

| Komponent | Wpływ | Opis |
|-----------|-------|------|
| `prisma/schema.prisma` | Minimalny | Typy GMAIL/LINKEDIN/TWITTER już istnieją w enum |
| `src/lib/scrapeService.ts` | Brak | Scraping WWW nie zmienia się |
| `src/lib/aiService.ts` | Rozszerzenie | Nowa funkcja: konwersja intencji na Gmail query (LLM) |
| `src/lib/editionService.ts` | Brak | addArticleToEdition() reusowane |
| `src/app/api/sources/private/` | Rozszerzenie | Nowe endpointy per connector type |
| `scraper/` | Rozszerzenie | Nowe endpointy: LinkedIn feed, X/Twitter timeline |
| UI Settings/Integrations | Nowe komponenty | GmailWizard (3 zakładki), LinkedInWizard, TwitterWizard |

### 7.3 Nowe zależności

Patrz sekcja 5.7.

---

## 8. Wymagania dla Sally (UX/UI)

### 8.1 Ekrany wymagające mockupów

| # | Ekran | Priorytet | Mockup |
|---|-------|-----------|--------|
| 1 | Gmail Setup Wizard (3 zakładki: Wklej/Wyszukaj/Przeglądaj) | MUST | `ui_gmail_wizard_v2_1.html` |
| 2 | LinkedIn Setup Wizard (login + disclaimer + test) | MUST | `ui_linkedin_wizard_v2_1.html` |
| 3 | X/Twitter Setup Wizard (cookies/login + disclaimer) | SHOULD | `ui_twitter_wizard_1.html` |
| 4 | Settings: Connector Status Dashboard | MUST | `ui_connectors_dashboard_1.html` |
| 5 | Settings: Zarządzanie nadawcami Gmail | SHOULD | Zintegrowane z Gmail Wizard |
| 6 | Notyfikacja: Credentials wygasły / re-auth | SHOULD | `ui_notification_credentials_expired_1.html` |

### 8.2 Wytyczne dla Sally

- Spójność z istniejącym UI (Tailwind CSS, dark/light)
- Mobile-first (PWA)
- Gmail wizard: 3 zakładki (Wklej nadawcę / Wyszukaj / Przeglądaj skrzynkę)
- Domyślnie NIC nie zaznaczone - użytkownik ma pełną kontrolę
- Podgląd ostatniego emaila/posta w selekcji
- Disclaimer (LinkedIn/X) musi być widoczny ale nie blokujący

---

## 9. Pytania otwarte (do decyzji PO)

### Rozstrzygnięte (PO review v2.0, 2026-02-09)

1. **Gmail: tryb testowy vs weryfikacja Google?**
   - **Decyzja PO:** Tryb testowy na start (MVP)

2. **Kolejność implementacji connectorów?**
   - **Decyzja PO:** Gmail → LinkedIn → X (zgodnie z rekomendacją)

3. **Czy LinkedIn disclaimer jest wystarczający prawnie?**
   - **Decyzja PO:** Wystarczający na ten moment

4. **Twikit vs twscrape?**
   - **Decyzja PO:** Twikit

5. **Kiedy angażujemy Sally?**
   - **Decyzja PO:** Po zatwierdzeniu analizy v2.0

6. **Gmail LLM query: który model?**
   - **Decyzja PO:** Istniejący PAL z `aiService.ts`

### Usunięte pytania (z v1.0)

- ~~LinkedIn/X: co gdy 2FA blokuje?~~ → Odpowiedź: manual cookie input jako fallback
- ~~Playwright dla LinkedIn/X?~~ → Zastąpiony przez Twikit (X) i linkedin-api (LinkedIn)
- ~~Gmail auto-detekcja newsletterów?~~ → Zmienione na precyzyjny import (3 ścieżki)

---

## 10. Kolejne kroki (BMAD workflow)

| Krok | Odpowiedzialny | Status |
|------|---------------|--------|
| 1. ~~Review analizy v1.0 przez PO~~ | PO | ✅ Done |
| 2. ~~Aktualizacja analizy do v2.0~~ | Mary | ✅ Done |
| 3. ~~Review analizy v2.0 przez PO~~ | PO | ✅ Done (2026-02-09) |
| 4. ~~Angażowanie Sally (mockupy)~~ | Sally | ✅ Done (5 mockupów) |
| 5. ~~Sprint planning~~ | Bob | ✅ Done (5 sprintów SI-1..SI-5, backlog v1.4) |
| 6. ~~Architektura techniczna~~ | Winston | ✅ Done (HLD v1.4, LLD v1.4) |
| 7. Implementacja | Amelia | Następny krok (SI-1 first) |
| 8. Test plan + testy | Quinn | Czeka na implementację |
| 9. ~~Aktualizacja user-stories.md~~ | Mary/Bob | ✅ Done (Epic 14, user-stories v2.7) |
| 10. ~~Aktualizacja hld.md, lld.md~~ | Winston | ✅ Done (v1.4) |
