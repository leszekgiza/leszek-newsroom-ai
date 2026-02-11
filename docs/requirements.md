# Leszek Newsroom AI - Dokument Wymagań

**Wersja:** 2.6
**Data:** 2026-02-09
**Status:** Draft

---

## 1. Wprowadzenie

### 1.1 Cel Aplikacji
Uniwersalny agregator treści z dowolnych źródeł internetowych, umożliwiający śledzenie najnowszych artykułów, newsletterów i postów z social media w jednym miejscu. Użytkownik sam konfiguruje jakie strony chce obserwować.

### 1.2 Główna Persona
**Każdy, kto chce agregować newsy** - osoba, która:
- Śledzi wiele źródeł informacji (blogi, portale, newslettery)
- Ma ograniczony czas na przeglądanie wielu stron
- Potrzebuje szybkich streszczeń aby ocenić wartość artykułu
- Korzysta z telefonu w drodze
- Chce zapisać informacje aby użyć je później

### 1.3 Scenariusze Użycia
1. **Poranny przegląd** - 20 min przeglądania najnowszych artykułów przy kawie
2. **Deep dive** - szczegółowe czytanie wybranych artykułów na desktopie
3. **Mobile check** - szybkie sprawdzenie nowości w komunikacji/transporcie
4. **Sprawdzanie nowości z użyciem TTS, a kiedyś również rozmowa z STT**

### 1.4 Architektura Źródeł

System rozróżnia dwa typy źródeł:

| Typ | Opis | Scraping | Widoczność |
|-----|------|----------|------------|
| **Catalog (shared)** | Publiczne blogi/portale | Raz dla wszystkich | Subskrybenci |
| **Private (per-user)** | Auth sites, Gmail, LinkedIn | Per-user | Tylko owner |

**Catalog Sources:**
- Współdzielone przez wszystkich użytkowników
- User SUBSKRYBUJE źródła z katalogu
- Efektywność: 1 scrape = 1000 userów

**Private Sources:**
- Strony wymagające logowania (user podaje credentials)
- Gmail (OAuth) - newslettery
- LinkedIn (li_at cookie) - posty ekspertów
- Prywatność: widoczne TYLKO dla właściciela

**Future (v3.0):**
- Topic-based discovery (user definiuje tematy, AI szuka w internecie)
- Dzienny podcast z podsumowaniem

### 1.5 Niezależność dostawców (Provider-agnostic + BYO keys)
- Core OSS nie jest związany z jednym dostawcą LLM/TTS
- Użytkownik OSS dostarcza własne klucze API (BYO keys)
- Dostawcy w dokumencie są tylko przykładami

---

## 2. Wymagania Funkcjonalne

### F1: Agregacja Treści

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F1.1 | Pobieranie artykułów ale to nie jest z RSS feeds po prostu robimy scraping ze strony internetowej| MUST |
| F1.2 | Integracja z Gmail (newslettery) - OAuth + Gmail API + LLM matching (3 ścieżki dodawania nadawców) | MUST |
| F1.3 | Integracja z LinkedIn (wall/feed) - login/cookies + Voyager API (linkedin-api Python) | MUST |
| F1.4 | Integracja z X/Twitter (timeline) - cookies + Twikit (Python, async) | SHOULD |
| F1.5 | Automatyczne odświeżanie co X minut | MUST |
| F1.6 | Deduplikacja artykułów (ten sam URL) | MUST |
| F1.7 | Ekstrakcja daty publikacji z URL artykułu (wzorce: `/YYYY-MM-DD/`, `/YYYYMMDD/`, `/posts/YYYY-MM-DD-slug/`) | MUST |
| F1.8 | Wyświetlanie rzeczywistej daty publikacji (nie daty pobrania) | MUST |
| F1.9 | **Pobieranie ze wszystkich źródeł z postępem na żywo (SSE)** | SHOULD |

### F2: Czytanie i Konsumpcja

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F2.1 | **2-zdaniowe intro widoczne od razu** (generowane przez AI w języku polskim podczas scrapowania) | MUST |
| F2.2 | Pełne AI streszczenie po kliknięciu "Więcej" (200-300 słów, fakty i insighty) | MUST |
| F2.2.1 | Automatyczne generowanie streszczenia gdy brak lub za krótkie (<100 słów) | MUST |
| F2.2.2 | Możliwość regeneracji streszczenia przez użytkownika | SHOULD |
| F2.3 | Text-to-Speech dla streszczeń | SHOULD |
| F2.4 | Otwieranie pełnego artykułu w nowej karcie | MUST |
| F2.5 | Badge NEW dla nieprzeczytanych artykułów | MUST |
| F2.6 | Automatyczne oznaczanie jako przeczytane | MUST |

### F3: Organizacja

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F3.1 | Zapisywanie artykułów na później | MUST |
| F3.2 | Usuwanie zapisanych artykułów | MUST |
| F3.3 | Filtrowanie po źródle | MUST |
| F3.4 | Wyszukiwanie w tytułach i streszczeniach (PostgreSQL FTS, język polski) | MUST |
| F3.5 | Tagowanie/kategoryzacja artykułów | COULD |
| F3.6 | Oznaczanie artykułów jako "nie interesuje mnie" (przeniesienie do Kosza) | SHOULD |
| F3.7 | Przeglądanie i przywracanie artykułów z Kosza | SHOULD |
| F3.8 | **Sortowanie artykułów od najnowszych do najstarszych** (wg daty publikacji, artykuły bez daty na końcu) | MUST |

### F4: Personalizacja

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F4.1 | Wybór głosu TTS (męski/żeński) | SHOULD |
| F4.2 | **Dodawanie własnych źródeł stron** | MUST |
| F4.3 | Zarządzanie listą źródeł (CRUD) | MUST |
| F4.4 | Ukrywanie niechcianych źródeł | SHOULD |
| F4.5 | Ustawienia per użytkownik | MUST |
| F4.6 | **Konfiguracja stron do scrapowania** (w ustawieniach) | MUST |
| F4.7 | **Przełączanie dark/light theme** | MUST |
| F4.8 | **Przechowywanie login/hasło do stron** (encrypted) | SHOULD |
| F4.9 | **Wybór głosu TTS w ustawieniach** (pl/en, męski/żeński) | SHOULD |
| F4.10 | **Ustawienie domyślnego widoku** (Feed/Wydanie) | SHOULD |

### F5: Autentykacja

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F5.1 | Rejestracja nowego użytkownika | MUST |
| F5.2 | Logowanie (email/hasło lub OAuth) | MUST |
| F5.3 | Wylogowanie | MUST |
| F5.4 | Resetowanie hasła | SHOULD |
| F5.5 | Sesje per urządzenie | SHOULD |

### F6: Source Integrations (Connectors)

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F6.1 | Gmail OAuth (gmail.readonly, test mode) + precyzyjny import nadawców (3 ścieżki: Paste/Search/Browse) | MUST |
| F6.2 | LinkedIn feed - Voyager API (linkedin-api Python) + disclaimer o ryzyku | MUST |
| F6.3 | X/Twitter timeline - Twikit (Python, async) + cookies auth | SHOULD |
| F6.4 | Connector Status Dashboard - status, last sync, article count, inline progress | MUST |
| F6.5 | Connector health check + retry (max 3, exponential backoff) | MUST |
| F6.6 | Sync scheduler - per-connector interwały (Gmail 60min, LinkedIn 120min, X 180min) | MUST |
| F6.7 | Notyfikacje credentials expired (top banner + toast, re-auth prompt) | SHOULD |
| F6.8 | LLM-assisted Gmail search - konwersja intencji na Gmail query (PAL) | SHOULD |
| F6.9 | LLM pre-klasyfikacja nadawców Gmail (newsletter / marketing / transakcyjny / osobisty) | SHOULD |

### F7: Zaawansowane Funkcje (z research'u)

| ID | Wymaganie | Priorytet | Źródło |
|----|-----------|-----------|--------|
| F7.1 | Czytanie offline (cache artykułów) | COULD |
| F7.2 | **AI Voice Chatbot** - rozmowa głosowa o artykule (STT+TTS) | COULD | Best practices |
| F7.3 | Zapisywanie artykułów do przeczytania później z przypomnieniem | COULD | Pocket pattern |

### F8: Wydania (Editions)

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F8.1 | Codzienne grupowanie artykułów w "wydania" z datą | SHOULD |
| F8.2 | Widok kalendarza/listy wydań | SHOULD |
| F8.3 | Przeglądanie historycznych wydań | SHOULD |
| F8.4 | Badge z liczbą nieprzeczytanych artykułów w wydaniu | SHOULD |
| F8.5 | Automatyczne tworzenie nowego wydania o północy | SHOULD |
| F8.6 | **TTS dla całego wydania** (audio z wszystkich artykułów) | SHOULD |

### F9: Text Q&A per Article (Conversational Agent - OSS)

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F9.1 | Rozmowa tekstowa z pojedynczym artykułem (context stuffing) | MUST |
| F9.2 | Kontekst = treść artykułu + intro + summary | MUST |
| F9.3 | Streaming odpowiedzi (SSE) | SHOULD |
| F9.4 | Historia rozmowy w sesji (in-memory) | SHOULD |
| F9.5 | Limity tokenów/wiadomości per sesja (cost guards) | MUST |
| F9.6 | LLM provider-agnostic (BYO keys) | MUST |

### F10: Voice Input / STT (Premium)

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F10.1 | Push-to-talk (nie real-time duplex) | SHOULD |
| F10.2 | STT provider-agnostic (BYO keys w OSS, managed w Premium) | SHOULD |
| F10.3 | Transkrypcja mowy → tekst → Q&A pipeline | SHOULD |
| F10.4 | Odpowiedź głosowa (TTS) na pytanie głosowe | COULD |

### F11: Topic-Clustered Briefings (Premium)

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F11.1 | Automatyczne grupowanie artykułów po tematach (AI clustering) | SHOULD |
| F11.2 | Generowanie briefing script z clustered artykułów | SHOULD |
| F11.3 | TTS playback briefingu (podcast-style) | SHOULD |
| F11.4 | Konfiguracja tematów/preferencji przez użytkownika | COULD |

### F12: Multi-Article Q&A (Premium)

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F12.1 | Q&A across multiple artykułów (cross-article context) | COULD |
| F12.2 | Context stuffing z wielu artykułów (z limitem tokenów) | COULD |
| F12.3 | Źródła odpowiedzi (cytaty z konkretnych artykułów) | COULD |

### F13: Managed Connectors (Premium)

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| F13.1 | Gmail connector (managed OAuth, bez BYO keys) | SHOULD |
| F13.2 | LinkedIn connector (managed scraping, rotacja kont) | SHOULD |
| F13.3 | Twitter/X connector (managed, multi-account rotation) | COULD |
| F13.4 | SLA monitoring + alerting (Premium ops) | SHOULD |

> **Nota:** F6 (OSS) = BYO credentials/keys. F13 (Premium) = managed infrastructure, wyższe SLA.

---

## 3. Wymagania Niefunkcjonalne

### NF1: Wydajność

| ID | Wymaganie | Metryka |
|----|-----------|---------|
| NF1.1 | Czas ładowania strony głównej | < 2 sekundy |
| NF1.2 | Czas generowania intro | < 5 sekund |
| NF1.3 | Płynne przewijanie listy | 60 FPS |
| NF1.4 | Obsługa 100+ artykułów na liście | Bez lagów |

### NF2: Responsywność (Mobile-First)

| ID | Wymaganie | Specyfikacja |
|----|-----------|--------------|
| NF2.1 | Breakpoint mobile | 320px - 767px |
| NF2.3 | Breakpoint desktop | 1024px+ |
| NF2.4 | Touch-friendly buttons | Min 44x44px |
| NF2.5 | Bottom navigation na mobile | Zamiast top |

### NF3: Dostępność (A11y)

| ID | Wymaganie |
|----|-----------|
| NF3.1 | Kontrast kolorów WCAG AA |
| NF3.2 | Nawigacja klawiaturą |
| NF3.3 | Screen reader compatible |
| NF3.4 | Focus states widoczne |

### NF4: Bezpieczeństwo

| ID | Wymaganie |
|----|-----------|
| NF4.1 | Hashowanie haseł (bcrypt) |
| NF4.2 | Secure session tokens |
| NF4.3 | CORS policy |
| NF4.4 | Rate limiting API |
| NF4.5 | **Szyfrowanie credentials stron zewnętrznych (AES-256)** |
| NF4.6 | Credential storage w bezpiecznej lokalizacji (env vars) |

### NF5: Niezależność dostawców (Provider-agnostic)

| ID | Wymaganie |
|----|-----------|
| NF5.1 | Core OSS nie może być związany z jednym dostawcą LLM/TTS |
| NF5.2 | BYO keys: użytkownik OSS dostarcza własne klucze API |
| NF5.3 | Brak bezpłatnych limitów w OSS (koszty po stronie użytkownika) |
| NF5.4 | Dostawcy w dokumentacji są tylko przykładami, nie zależnościami |

### NF6: Provider Abstraction Layer

| ID | Wymaganie |
|----|-----------|
| NF6.1 | Unified interface dla LLM providers (summary, Q&A, clustering) |
| NF6.2 | Unified interface dla TTS providers (article, edition, briefing) |
| NF6.3 | Unified interface dla STT providers (voice input) |
| NF6.4 | Provider selection via env vars (LLM_PROVIDER, TTS_PROVIDER, STT_PROVIDER) |
| NF6.5 | Graceful degradation: fallback messaging gdy brak BYO keys |

---

## 4. Architektura Danych

### 4.1 Nowe Tabele

```sql
-- Użytkownicy
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Źródła użytkownika
CREATE TABLE user_sources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    url TEXT NOT NULL,
    name TEXT,
    type TEXT, -- rss, website, gmail, linkedin, twitter
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, url)
);

-- Rozszerzenie news_items
ALTER TABLE news_items ADD COLUMN intro TEXT;
ALTER TABLE news_items ADD COLUMN intro_generated_at TIMESTAMPTZ;
```

### 4.2 Modyfikacje Istniejących Tabel

```sql
-- saved: dodanie user_id
ALTER TABLE saved ADD COLUMN user_id INTEGER REFERENCES users(id);

-- articles: dodanie user_id
ALTER TABLE articles ADD COLUMN user_id INTEGER REFERENCES users(id);

-- settings: dodanie user_id
ALTER TABLE settings ADD COLUMN user_id INTEGER REFERENCES users(id);
```

---

## 5. Decyzje Techniczne

### 5.1 UI Framework
- **Decyzja:** Lista/karty (porzucenie Reveal.js)
- **Uzasadnienie:** Lepszy UX na mobile, prostszy kod, scroll myszką działa

### 5.2 Auto-Intro
- **Decyzja:** LLM provider-agnostic (przykład: Claude)
- **Implementacja:** Background job po dodaniu artykułu
- **Cache:** Zapisywane w bazie, generowane raz

### 5.3 Scraping
- **Decyzja:** Crawl4AI (self-hosted)
- **Uzasadnienie:** Open source (Apache 2.0), LLM-ready markdown, obsługa JavaScript (Playwright)
- **Deployment:** Docker na Oracle Cloud
- **Dokumentacja:** https://docs.crawl4ai.com/

### 5.4 Autentykacja
- **Decyzja:** Własny JWT cookie auth (bez NextAuth)
- **Uzasadnienie:** Prostota, brak zależności od zewnętrznych providerów auth

### 5.5 Wyszukiwanie
- **Decyzja:** PostgreSQL Full-Text Search (FTS)
- **Język:** Polski (konfiguracja `polish` dla tsvector/tsquery)
- **Zakres:** Tytuły artykułów + AI-generowane streszczenia
- **Uzasadnienie:**
  - Zero dodatkowych kosztów (wbudowane w PostgreSQL)
  - Szybkie (~5ms) wyszukiwanie
  - Natywne wsparcie dla języka polskiego (stemming, stop words)
  - Możliwość rozszerzenia o semantic search w przyszłości
- **Implementacja:**
  ```sql
  -- Kolumna tsvector dla wyszukiwania
  ALTER TABLE news_items ADD COLUMN search_vector tsvector;

  -- Indeks GIN dla szybkiego wyszukiwania
  CREATE INDEX idx_news_search ON news_items USING GIN(search_vector);

  -- Trigger do automatycznej aktualizacji
  CREATE TRIGGER news_search_update
  BEFORE INSERT OR UPDATE ON news_items
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.polish', title, intro, summary);
  ```

### 5.6 API-First Architecture
- **Decyzja:** Cała funkcjonalność dostępna przez REST API (`/api/*`)
- **Uzasadnienie:**
  - Separacja logiki biznesowej od UI
  - Łatwe testowanie API niezależnie od interfejsu
  - Możliwość budowy aplikacji mobilnej w przyszłości
  - Możliwość integracji z zewnętrznymi narzędziami (CLI, automatyzacje)
  - Jasny kontrakt między frontendem a backendem
- **Implementacja:** Next.js API Routes, UI jako konsument API

### 5.7 Provider-agnostic AI/TTS (BYO keys)
- **Decyzja:** Core OSS jest niezależny od dostawców LLM/TTS
- **Uzasadnienie:** Brak lock-in, użytkownik sam wybiera dostawcę i klucze
- **Implementacja:** Konfiguracja przez env vars (np. `LLM_PROVIDER`, `LLM_API_KEY`, `TTS_PROVIDER`, `TTS_API_KEY`)

---

## 6. Priorytety MoSCoW

### MUST (MVP)
- Lista artykułów z kartami
- 2-zdaniowe intro od razu
- Pełne streszczenie po kliknięciu
- Jednocześnie powinien być link pod którym mogę przejść do źródła artykułu
- Logowanie/rejestracja
- Zapisywanie artykułów
- Dodawanie własnych stron do scrapowania
- TTS dla streszczeń
- **Wyszukiwanie w tytułach i streszczeniach (PostgreSQL FTS, polski)**

### SHOULD
- Gmail integration - w kontekście odczytywania newsletterów
- LinkedIn integration w kontekście odczytywania postów ekspertów

### COULD
- Twitter/Nitter

### WON'T (na razie)
- Internacjonalizacja (i18n)
- Export do PDF

---

## 7. Załączniki

### 7.1 Źródła (konfigurowalne przez użytkownika)
Użytkownik sam dodaje źródła które chce śledzić. Aplikacja wspiera:
- Strony z artykułami (scraping)
- Strony wymagające logowania (z przechowywaniem credentials)
- Newslettery (Gmail integration)
- Social media (LinkedIn, Twitter/X)

**Przykładowe źródła:**
1. Ethan Mollick - One Useful Thing
2. Benedict Evans
3. Stratechery
4. Marginal Revolution
5. Hugging Face Blog
6. Simon Willison
7. Hamel Husain
8. Phil Schmid
9. Eugene Yan
10. Lilian Weng
11. Interconnects
12. Sebastian Raschka
13. Chip Huyen
14. The Batch (DeepLearning.AI)
15. strefainwestora.pl (wymaga logowania)
16. inwestomat.eu

### 7.2 Infrastruktura
- **Serwer:** Oracle Cloud Free Tier (Ubuntu 22.04)
- **Baza:** PostgreSQL (lokalna)
- **Backend:** Next.js API Routes (Node.js)
- **Scraping:** Crawl4AI (Python, Docker)
- **AI:** Provider-agnostic (przykład: Claude API)
- **TTS:** Provider-agnostic (przykład: Edge TTS)
