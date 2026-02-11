# Leszek Newsroom AI - User Stories

**Wersja:** 2.7
**Data:** 2026-02-09
**Format:** Jako [rola] chcę [funkcja] aby [korzyść]

---

## Provider-agnostic + BYO keys (OSS)
- Core OSS nie jest zwiazany z jednym dostawca LLM/TTS
- Uzytkownik OSS dostarcza wlasne klucze API
- Dostawcy w story sa tylko przykladami

## Epic 1: Przeglądanie Newsów

### US1.1 - Widok listy artykułów
**Jako** użytkownik
**Chcę** widzieć listę najnowszych artykułów z moich źródeł w formie kart
**Aby** szybko przejrzeć co nowego

**Kryteria akceptacji:**
- [x] Artykuły wyświetlane jako karty z tytułem, źródłem, datą
- [x] **Data publikacji wyświetlana jako rzeczywista data** (nie data pobrania)
- [x] **Data wyciągana z URL artykułu** (wzorce: `/YYYY-MM-DD/`, `/YYYYMMDD/`, `/posts/YYYY-MM-DD-slug/`)
- [x] 2-zdaniowe intro widoczne od razu (bez klikania)
- [x] Badge "NEW" przy nieprzeczytanych
- [x] **Sortowanie od najnowszych do najstarszych (wg publishedAt DESC, artykuły bez daty na końcu)**
- [x] Infinite scroll lub paginacja

---

### US1.2 - Filtrowanie po źródle
**Jako** użytkownik
**Chcę** filtrować artykuły po źródle
**Aby** skupić się na wybranych źródłach

**Kryteria akceptacji:**
- [ ] Dropdown z listą źródeł
- [ ] Opcja "Wszystkie źródła"
- [ ] Licznik artykułów przy każdym źródle
- [ ] Filtr zachowany po odświeżeniu strony

---

### US1.3 - Badge NEW
**Jako** użytkownik
**Chcę** widzieć badge NEW przy nieprzeczytanych artykułach
**Aby** wiedzieć co jest nowe od ostatniej wizyty

**Kryteria akceptacji:**
- [ ] Badge znika po przeczytaniu
- [ ] Artykuł oznaczony jako przeczytany po 3 sekundach
- [ ] Możliwość ręcznego oznaczenia jako przeczytany

---

### US1.4 - Przewijanie myszką
**Jako** użytkownik
**Chcę** przewijać listę artykułów kółkiem myszy
**Aby** naturalnie przeglądać treści (nie jak w prezentacji)

**Kryteria akceptacji:**
- [ ] Scroll działa płynnie (60 FPS)
- [ ] Brak przechwytywania scroll przez framework

---

## Epic 2: Czytanie Artykułów

### US2.1 - 2-zdaniowe intro
**Jako** użytkownik
**Chcę** widzieć 2-zdaniowe streszczenie od razu przy każdym artykule
**Aby** szybko ocenić czy artykuł jest wart przeczytania

**Kryteria akceptacji:**
- [x] Intro generowane automatycznie przez AI podczas scrapowania
- [x] Widoczne bez klikania
- [x] Jakość: zwięzłe, informacyjne, po polsku (nawet dla artykułów anglojęzycznych)

**Szczegóły techniczne:**
- LLM provider-agnostic (przykład: Claude) w `scrape/trigger` endpoint
- Generowane podczas scrapowania, nie on-demand
- Max 50 słów, dokładnie 2 zdania

---

### US2.2 - Pełne streszczenie AI
**Jako** użytkownik
**Chcę** zobaczyć pełne streszczenie po kliknięciu "Więcej"
**Aby** zrozumieć kluczowe punkty bez czytania całego artykułu

**Kryteria akceptacji:**
- [x] Modal lub side panel ze streszczeniem
- [x] Struktura: podsumowanie, kluczowe insighty, implikacje
- [x] Loading indicator podczas generowania
- [x] Cache - nie generuj ponownie
- [x] **Długość: 200-300 słów (1-2 minuty TTS)**
- [x] **Fakty i insighty z artykułu (liczby, przykłady, wnioski)**
- [x] **Automatyczna regeneracja gdy streszczenie za krótkie (<100 słów)**
- [x] **Przycisk "Wygeneruj ponownie" do manualnej regeneracji**

**Szczegóły techniczne:**
- LLM provider-agnostic (przykład: Claude)
- Endpoint: `POST /api/articles/[id]/summarize`
- Automatyczne generowanie przy otwieraniu modala

---

### US2.3 - Text-to-Speech (MUST)
**Jako** użytkownik
**Chcę** odsłuchać streszczenie artykułu
**Aby** konsumować treści w drodze/transporcie/podczas innych czynności

**Kryteria akceptacji:**
- [x] Play/Pause/Stop controls
- [x] Wybór głosu (męski/żeński) - w ustawieniach
- [x] Postęp odtwarzania widoczny
- [ ] Działanie na mobile (w tle)

**Szczegóły techniczne:**
- TTS provider-agnostic (przykład: Edge TTS)
- Endpoint: `POST /api/tts`
- Głosy: pl-PL-MarekNeural, pl-PL-ZofiaNeural, en-US-GuyNeural, en-US-JennyNeural

---

### US2.4 - Otwarcie pełnego artykułu
**Jako** użytkownik
**Chcę** otworzyć pełny artykuł w nowej karcie
**Aby** przeczytać całość na oryginalnej stronie

**Kryteria akceptacji:**
- [ ] Przycisk "Otwórz" lub kliknięcie w tytuł
- [ ] Otwiera w nowej karcie (target="_blank")
- [ ] Artykuł oznaczony jako przeczytany

---

## Epic 3: Organizacja

### US3.1 - Zapisywanie artykułów
**Jako** użytkownik
**Chcę** zapisać artykuł na później
**Aby** wrócić do niego gdy będę miał więcej czasu

**Kryteria akceptacji:**
- [ ] Przycisk "Zapisz" przy każdym artykule
- [ ] Wizualne potwierdzenie (ikona zmienia kolor)
- [ ] Zapisane artykuły na osobnej stronie /saved

---

### US3.2 - Zarządzanie zapisanymi
**Jako** użytkownik
**Chcę** przeglądać i usuwać zapisane artykuły
**Aby** utrzymać porządek w mojej liście do przeczytania

**Kryteria akceptacji:**
- [ ] Lista zapisanych artykułów
- [ ] Przycisk "Usuń" przy każdym
- [ ] Potwierdzenie usunięcia

---

### US3.4 - Oznaczanie "nie interesuje mnie" (Kosz)
**Jako** użytkownik
**Chcę** oznaczyć artykuł jako "nie interesuje mnie"
**Aby** usunąć go z głównego feedu bez trwałego usuwania

**Kryteria akceptacji:**
- [ ] Przycisk "Nie interesuje" przy każdym artykule (ikona X lub kosz)
- [ ] Artykuł znika z głównego feedu
- [ ] Artykuł trafia do folderu "Kosz"
- [ ] Możliwość przywrócenia artykułu z Kosza
- [ ] Opcja trwałego usunięcia z Kosza

**Szczegóły techniczne:**
- Nowa tabela `dismissed_articles` (userId, articleId, dismissedAt)
- Endpoint: `POST /api/articles/[id]/dismiss`
- Endpoint: `DELETE /api/articles/[id]/dismiss` (przywrócenie)
- Strona `/trash` z listą odrzuconych artykułów

---

### US3.3 - Wyszukiwanie (MUST)
**Jako** użytkownik
**Chcę** wyszukać artykuł po słowach kluczowych
**Aby** znaleźć konkretny temat

**Kryteria akceptacji:**
- [ ] Pole wyszukiwania na górze strony (mobile + desktop)
- [ ] Wyszukiwanie w tytułach i AI-generowanych streszczeniach
- [ ] **Wsparcie dla języka polskiego** (stemming, odmiana wyrazów)
- [ ] Wyniki na żywo (live search, debounce 300ms)
- [ ] Podświetlanie dopasowanych fragmentów w wynikach

**Szczegóły techniczne:**
- PostgreSQL Full-Text Search (tsvector/tsquery)
- Konfiguracja językowa: `pg_catalog.polish`
- Indeks GIN dla wydajności (~5ms query time)
- Przeszukiwane kolumny: `title`, `intro`, `summary`

---

## Epic 4: Personalizacja Źródeł

### US4.1 - Dodawanie własnych źródeł stron
**Jako** użytkownik
**Chcę** dodać własną stronę internetową do obserwowania
**Aby** śledzić blogi/portale które mnie interesują

**Kryteria akceptacji:**
- [ ] Formularz: URL, nazwa, kategoria
- [ ] Walidacja URL (czy strona jest dostępna)
- [ ] Podgląd artykułów przed zatwierdzeniem

---

### US4.2 - Konfiguracja scrapowania
**Jako** użytkownik
**Chcę** skonfigurować jak strona jest scrapowana
**Aby** poprawnie pobierać artykuły z różnych layoutów stron

**Kryteria akceptacji:**
- [ ] Formularz: URL strony, selektor CSS (opcjonalnie)
- [ ] Automatyczne wykrywanie artykułów
- [ ] Konfiguracja w ustawieniach
- [ ] Podgląd wyników scrapowania

---

### US4.3 - Zarządzanie źródłami
**Jako** użytkownik
**Chcę** edytować i usuwać moje źródła
**Aby** dostosować feed do moich potrzeb

**Kryteria akceptacji:**
- [ ] Lista moich źródeł w ustawieniach
- [ ] Edycja nazwy, kategorii
- [ ] Usuwanie źródła
- [ ] Włączanie/wyłączanie bez usuwania

---

### US4.5 - Logowanie do stron chronionych
**Jako** użytkownik
**Chcę** podać login i hasło do strony wymagającej logowania
**Aby** pobierać treści z paywallem lub wymagające autoryzacji

**Kryteria akceptacji:**
- [ ] Formularz: URL, login, hasło
- [ ] Hasło przechowywane szyfrowane (encrypted)
- [ ] Testowanie połączenia przed zapisaniem
- [ ] Możliwość aktualizacji credentials

---

### US4.4 - Ukrywanie źródeł
**Jako** użytkownik
**Chcę** ukryć domyślne źródło którego nie chcę widzieć
**Aby** nie zaśmiecać mojego feedu

**Kryteria akceptacji:**
- [ ] Toggle "Ukryj" przy źródle
- [ ] Ukryte źródła na osobnej liście
- [ ] Możliwość przywrócenia

---

## Epic 5: Autentykacja

### US5.1 - Rejestracja
**Jako** nowy użytkownik
**Chcę** założyć konto
**Aby** mieć własne zapisane artykuły i ustawienia

**Kryteria akceptacji:**
- [ ] Formularz: email, hasło, powtórz hasło
- [ ] Walidacja email (format, unikalność)
- [ ] Walidacja hasła (min 8 znaków)
- [ ] Email potwierdzający (opcjonalnie)

---

### US5.2 - Logowanie
**Jako** zarejestrowany użytkownik
**Chcę** się zalogować
**Aby** mieć dostęp do moich danych

**Kryteria akceptacji:**
- [ ] Formularz: email, hasło
- [ ] "Zapamiętaj mnie" checkbox
- [ ] Błąd przy złych danych
- [ ] Redirect do strony głównej po logowaniu

---

### US5.3 - Wylogowanie
**Jako** zalogowany użytkownik
**Chcę** się wylogować
**Aby** zakończyć sesję na urządzeniu

**Kryteria akceptacji:**
- [ ] Przycisk "Wyloguj" w menu
- [ ] Redirect do strony logowania
- [ ] Wyczyszczenie sesji

---

### US5.4 - Reset hasła
**Jako** użytkownik który zapomniał hasła
**Chcę** zresetować hasło
**Aby** odzyskać dostęp do konta

**Kryteria akceptacji:**
- [ ] Link "Zapomniałem hasła"
- [ ] Email z linkiem do resetu
- [ ] Formularz nowego hasła

---

## Epic 6: Wygląd i UX

### US6.1 - Dark/Light theme
**Jako** użytkownik
**Chcę** przełączać między ciemnym a jasnym motywem
**Aby** dopasować wygląd do moich preferencji/oświetlenia

**Kryteria akceptacji:**
- [ ] Toggle w ustawieniach lub headerze
- [ ] Zapamiętanie preferencji
- [ ] Opcja "Auto" (zgodne z systemem)

---

### US6.2 - Responsywność mobile
**Jako** użytkownik mobilny
**Chcę** wygodnie korzystać z aplikacji na telefonie
**Aby** przeglądać newsy w drodze

**Kryteria akceptacji:**
- [ ] Bottom navigation (nie top)
- [ ] Touch-friendly buttons (min 44px)
- [ ] Karty artykułów pełna szerokość
- [ ] Gestures (swipe to save?)

---


### US6.3 - Preferencje użytkownika
**Jako** użytkownik
**Chcę** zapisywać moje preferencje (głos TTS, domyślny widok, motyw)
**Aby** aplikacja pamiętała moje ustawienia między sesjami

**Kryteria akceptacji:**
- [x] Wybór głosu TTS (pl-PL-MarekNeural, pl-PL-ZofiaNeural, en-US-GuyNeural, en-US-JennyNeural)
- [x] Wybór domyślnego widoku (Feed / Wydanie dnia)
- [x] Wybór motywu (Light / Dark / System)
- [x] Preferencje zapisywane w bazie danych
- [x] Endpoint API GET/PUT /api/user/preferences

**Szczegóły techniczne:**
- Nowe pola w modelu User: ttsVoice, defaultView, theme
- Endpoint: GET/PUT /api/user/preferences
- Walidacja głosów TTS po stronie serwera


## Epic 7: Integracje (zastąpione przez Epic 14)

> **Uwaga:** Epic 7 został zastąpiony przez Epic 14 (Source Integrations) na podstawie analizy v2.0. Szczegóły w `docs/analysis-source-integrations.md`.

---

## Epic 14: Source Integrations (Gmail + LinkedIn + X/Twitter)

> **Analiza:** `docs/analysis-source-integrations.md` v2.0
> **Kolejność:** Gmail → LinkedIn → X/Twitter (decyzja PO)
> **Architektura:** Gmail = Node.js (googleapis), LinkedIn + X = Python microservice (scraper/)

### US14.1 - Połączenie Gmail (OAuth)
**Jako** użytkownik
**Chcę** połączyć moje konto Gmail przez OAuth
**Aby** system mógł wyszukiwać i importować wskazane przeze mnie maile

**Szczegóły:**
- Google OAuth consent screen z scope `gmail.readonly`
- Tryb testowy (MVP) - bez weryfikacji Google
- Refresh token przechowywany zaszyfrowany (AES-256-GCM)
- Automatyczne odświeżanie access tokena
- Notyfikacja gdy token wygaśnie i wymaga ponownego połączenia

**Kryteria akceptacji:**
- [ ] Przycisk "Połącz Gmail" w ustawieniach/integracje
- [ ] Google OAuth consent screen z gmail.readonly
- [ ] Refresh token zaszyfrowany w PrivateSource.credentials
- [ ] Auto-refresh access tokena przed wygaśnięciem
- [ ] Notyfikacja o wygasłym tokenie (re-auth prompt)

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
- LLM (istniejący PAL z aiService.ts) konwertuje opis na Gmail query
- System pokazuje wyniki pogrupowane po nadawcy
- Użytkownik zaznacza których nadawców importować

**Ścieżka C: Przeglądaj skrzynkę (Browse & Select)**
- System skanuje ostatnie 30 dni, grupuje po nadawcy
- LLM pre-klasyfikuje: newsletter / marketing / transakcyjny / osobisty
- Domyślnie NIC nie zaznaczone
- Użytkownik sam klika których nadawców chce importować

**Fallback:** Ręczne dodanie adresu nadawcy (bez skanowania)

**Kryteria akceptacji:**
- [ ] Ścieżka A: wyszukiwanie po adresie email nadawcy
- [ ] Ścieżka B: LLM generuje Gmail query z opisu intencji
- [ ] Ścieżka C: przeglądanie skrzynki pogrupowanej po nadawcach
- [ ] LLM klasyfikuje nadawców: newsletter / marketing / transakcyjny / osobisty
- [ ] Podgląd nadawcy: nazwa, email, ostatni temat, częstotliwość, liczba maili
- [ ] Domyślnie NIC nie jest zaznaczone - użytkownik sam wybiera
- [ ] Fallback: ręczne dodanie adresu email nadawcy
- [ ] UI: 3 zakładki w Gmail Wizard (mockup: `ui_gmail_wizard_v2_1.html`)

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

> **Nota:** Oficjalne LinkedIn API nie daje dostępu do feeda (r_member_social zamknięte od 06/2023). Używamy nieoficjalnego Voyager API z pełną świadomością ryzyka.

**Kryteria akceptacji:**
- [ ] Disclaimer o ryzyku (brak oficjalnego API, możliwy ban konta, naruszenie ToS)
- [ ] Użytkownik musi zaakceptować disclaimer przed połączeniem
- [ ] Login/hasło → Voyager API session (linkedin-api Python)
- [ ] Fallback: manual cookie li_at (z DevTools)
- [ ] Test połączenia przed zapisaniem
- [ ] Credentials zaszyfrowane AES-256-GCM
- [ ] UI: mockup `ui_linkedin_wizard_v2_1.html`

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

**Kryteria akceptacji:**
- [ ] Disclaimer o ryzyku (anty-bot, możliwy ban, nieoficjalne API)
- [ ] Auth: cookies (auth_token + ct0) jako preferowana metoda
- [ ] Auth: login/hasło jako fallback (mniej stabilne)
- [ ] Konfiguracja timeline: Following / For You
- [ ] Toggle: retweets, replies, threads
- [ ] Test połączenia przed zapisaniem
- [ ] Credentials zaszyfrowane AES-256-GCM
- [ ] UI: mockup `ui_twitter_wizard_1.html`

---

### US14.6 - Status połączeń (Connector Dashboard)
**Jako** użytkownik
**Chcę** widzieć status moich połączeń (Gmail, LinkedIn, X)
**Aby** wiedzieć czy synchronizacja działa poprawnie

**Kryteria akceptacji:**
- [ ] Dashboard w Settings/Integrations ze statusem per connector
- [ ] Statusy: connected (zielony) / syncing (niebieski) / error (czerwony) / expired (pomarańczowy) / disconnected (szary)
- [ ] Data ostatniej synchronizacji
- [ ] Liczba zaimportowanych artykułów
- [ ] Przycisk "Synchronizuj teraz" (manual sync)
- [ ] Inline progress synchronizacji (paski postępu, stats nowe/pominięte/błędy)
- [ ] Notyfikacja gdy credentials wygasną (top banner + toast)
- [ ] UI: mockupy `ui_connectors_dashboard_1.html`, `ui_notification_credentials_expired_1.html`

---

### US14.7 - Bezpieczeństwo credentials
**Jako** użytkownik
**Chcę** mieć pewność że moje dane logowania są bezpieczne
**Aby** nie bać się podawać credentials do swoich kont

**Kryteria akceptacji:**
- [ ] Credentials szyfrowane AES-256-GCM at-rest
- [ ] Klucz szyfrowania poza bazą danych (env var CREDENTIALS_ENCRYPTION_KEY)
- [ ] Credentials nigdy nie są logowane ani wyświetlane w UI
- [ ] Użytkownik może usunąć credentials w dowolnym momencie (przycisk "Rozłącz")
- [ ] Po usunięciu konta, wszystkie credentials są kasowane (cascade delete)

---

## Epic 8: Zaawansowane (COULD)

### US8.1 - Offline reading
**Jako** użytkownik
**Chcę** czytać zapisane artykuły offline
**Aby** przeglądać w samolocie/metrze bez internetu

---

### US8.2 - AI Voice Chatbot
**Jako** użytkownik
**Chcę** prowadzić rozmowę głosową o treści artykułu
**Aby** szybko uzyskać odpowiedzi bez pisania

**Kryteria akceptacji:**
- [ ] Przycisk "Porozmawiaj o artykule"
- [ ] Speech-to-text (rozpoznawanie mowy)
- [ ] Text-to-speech (odpowiedzi głosem)
- [ ] Kontekst rozmowy = treść artykułu
- [ ] Historia rozmowy w sesji

---

### US8.3 - Powiadomienia push
**Jako** użytkownik
**Chcę** otrzymywać powiadomienia o nowych artykułach z ulubionych źródeł
**Aby** nie przegapić ważnych treści

---

## Epic 9: Wydania (Editions)

### US9.1 - Codzienne wydania
**Jako** użytkownik
**Chcę** widzieć artykuły pogrupowane w codzienne "wydania" (jak gazeta)
**Aby** przeglądać newsy z konkretnego dnia i mieć poczucie porządku

**Kryteria akceptacji:**
- [ ] Artykuły grupowane automatycznie po dacie publikacji/pobrania
- [ ] Zakładka "Wydania" w nawigacji
- [ ] Lista wydań z datami (np. "29 grudnia 2025", "28 grudnia 2025")
- [ ] Badge z liczbą nieprzeczytanych artykułów w każdym wydaniu
- [ ] Kliknięcie wydania otwiera listę artykułów z tego dnia

---

### US9.2 - Przeglądanie historycznych wydań
**Jako** użytkownik
**Chcę** przeglądać wydania z poprzednich dni
**Aby** wrócić do artykułów które przegapiłem

**Kryteria akceptacji:**
- [ ] Widok kalendarza lub listy dat
- [ ] Możliwość przewijania w przeszłość
- [ ] Wizualne oznaczenie dni z nieprzeczytanymi artykułami
- [ ] Szybki skok do konkretnej daty

---

### US9.3 - Dzisiejsze wydanie jako domyślny widok
**Jako** użytkownik
**Chcę** widzieć dzisiejsze wydanie jako domyślny widok
**Aby** od razu zobaczyć najnowsze artykuły z dzisiejszego dnia

**Kryteria akceptacji:**
- [ ] Opcja w ustawieniach: "Domyślny widok: Feed / Dzisiejsze wydanie"
- [ ] Automatyczne przełączenie na nowe wydanie o północy
- [ ] Powiadomienie o nowym wydaniu (opcjonalnie)

**Szczegóły techniczne:**
- Nowa tabela `editions` (id, date, createdAt)
- Relacja article -> edition (opcjonalna, może być NULL dla starych artykułów)
- Endpoint: `GET /api/editions` - lista wydań
- Endpoint: `GET /api/editions/[date]` - artykuły z danego dnia
- Cron job o północy do tworzenia nowego wydania

---

### US9.4 - TTS dla całego wydania
**Jako** użytkownik
**Chcę** odsłuchać audio z całego wydania
**Aby** konsumować dzienne newsy podczas jazdy/spaceru

**Kryteria akceptacji:**
- [x] Przycisk "Słuchaj wydania" na stronie wydania
- [x] Audio generowane ze wszystkich artykułów wydania
- [x] Artykuły grupowane po źródłach
- [x] Głos zgodny z preferencjami użytkownika

---

## Epic 10: Text Q&A per Article (Conversational Agent - OSS)

### US10.1 - Rozmowa tekstowa z artykułem
**Jako** użytkownik
**Chcę** zadawać pytania o treść artykułu w formie czatu
**Aby** szybko uzyskać odpowiedzi bez czytania całego tekstu

**Kryteria akceptacji:**
- [ ] Przycisk "Zapytaj o artykuł" w modalu streszczenia
- [ ] Widok czatu (modal lub osobny ekran)
- [ ] Kontekst = treść artykułu + intro + summary (context stuffing)
- [ ] Streaming odpowiedzi (SSE)
- [ ] Historia rozmowy w sesji
- [ ] LLM provider-agnostic (BYO keys)

**Szczegóły techniczne:**
- Endpoint: `POST /api/articles/[id]/chat`
- Context stuffing (nie vector DB)
- Max context: ~100k tokens (zależy od providera)
- Streaming via SSE

---

### US10.2 - Cost guards dla Q&A
**Jako** użytkownik OSS
**Chcę** widzieć limity zużycia tokenów
**Aby** kontrolować koszty BYO keys

**Kryteria akceptacji:**
- [ ] Limit wiadomości per sesja (np. 20)
- [ ] Walidacja BYO keys przed pierwszym użyciem
- [ ] Informacja o szacowanym koszcie
- [ ] Graceful error gdy brak/niewłaściwe klucze

---

## Epic 11: Voice Input / STT (Premium)

### US11.1 - Push-to-talk
**Jako** użytkownik premium
**Chcę** zadawać pytania głosem (push-to-talk)
**Aby** prowadzić rozmowę hands-free

**Kryteria akceptacji:**
- [ ] Przycisk mikrofonu (push-to-talk, nie real-time duplex)
- [ ] Wizualizacja nagrywania (ikona, czas)
- [ ] Transkrypcja mowy → tekst → Q&A pipeline
- [ ] Odpowiedź głosowa (TTS) na pytanie głosowe
- [ ] STT provider-agnostic

---

## Epic 12: Topic-Clustered Briefings (Premium)

### US12.1 - Briefing z artykułów
**Jako** użytkownik premium
**Chcę** słuchać briefingu pogrupowanego tematycznie
**Aby** konsumować newsy jak podcast

**Kryteria akceptacji:**
- [ ] Automatyczne grupowanie artykułów po tematach (AI clustering)
- [ ] Generowanie briefing script z clustered artykułów
- [ ] TTS playback briefingu (podcast-style)
- [ ] Wybór tematów do briefingu
- [ ] Kontrola głębokości (krótki vs szczegółowy)

---

## Epic 13: Multi-Article Q&A (Premium)

### US13.1 - Q&A across multiple artykułów
**Jako** użytkownik premium
**Chcę** zadawać pytania dotyczące wielu artykułów naraz
**Aby** uzyskać syntetyczne odpowiedzi z wielu źródeł

**Kryteria akceptacji:**
- [ ] Wybór artykułów do kontekstu (multi-select)
- [ ] Context stuffing z wielu artykułów (z limitem tokenów)
- [ ] Cytaty z konkretnych artykułów w odpowiedzi
- [ ] Informacja o źródłach odpowiedzi

---

## Źródła

Wymagania oparte na analizie:
- [Zapier - Best News Apps 2025](https://zapier.com/blog/best-news-apps/)
- [Stfalcon - 10 Best News Apps](https://stfalcon.com/en/blog/post/10-best-news-apps)
- [OnStipe - News Aggregator Guide](https://onstipe.com/blog/10-best-news-aggregator-sites-in-2025-the-ultimate-guide/)

### Przykładowe źródła (konfigurowalne przez użytkownika)
- Blogi: Ethan Mollick, Benedict Evans, Simon Willison, Eugene Yan, Chip Huyen, Sebastian Raschka i inne
- Portale: strefainwestora.pl (wymaga logowania), inwestomat.eu
- Newslettery, social media (LinkedIn, Twitter/X)
