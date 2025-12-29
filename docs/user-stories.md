# Leszek Newsroom AI - User Stories

**Wersja:** 2.2
**Data:** 2025-12-29
**Format:** Jako [rola] chcę [funkcja] aby [korzyść]

---

## Epic 1: Przeglądanie Newsów

### US1.1 - Widok listy artykułów
**Jako** użytkownik
**Chcę** widzieć listę najnowszych artykułów z moich źródeł w formie kart
**Aby** szybko przejrzeć co nowego

**Kryteria akceptacji:**
- [ ] Artykuły wyświetlane jako karty z tytułem, źródłem, datą
- [ ] 2-zdaniowe intro widoczne od razu (bez klikania)
- [ ] Badge "NEW" przy nieprzeczytanych
- [ ] Sortowanie od najnowszych
- [ ] Infinite scroll lub paginacja

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
- [ ] Intro generowane automatycznie przez AI
- [ ] Widoczne bez klikania
- [ ] Jakość: zwięzłe, informacyjne, po polsku

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
- Claude API (claude-sonnet-4-20250514)
- Endpoint: `POST /api/articles/[id]/summarize`
- Automatyczne generowanie przy otwieraniu modala

---

### US2.3 - Text-to-Speech (MUST)
**Jako** użytkownik
**Chcę** odsłuchać streszczenie artykułu
**Aby** konsumować treści w drodze/transporcie/podczas innych czynności

**Kryteria akceptacji:**
- [x] Play/Pause/Stop controls
- [ ] Wybór głosu (męski/żeński) - w ustawieniach
- [x] Postęp odtwarzania widoczny
- [ ] Działanie na mobile (w tle)

**Szczegóły techniczne:**
- edge-tts-universal (Microsoft Edge TTS)
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

## Epic 7: Integracje

### US7.1 - Gmail - newslettery
**Jako** użytkownik
**Chcę** połączyć Gmail
**Aby** widzieć newslettery AI/ML w jednym miejscu

**Kryteria akceptacji:**
- [ ] Przycisk "Połącz Gmail" w ustawieniach
- [ ] OAuth flow (bezpieczne)
- [ ] Konfiguracja: od kogo pobierać
- [ ] Automatyczne pobieranie nowych maili

---

### US7.2 - LinkedIn
**Jako** użytkownik
**Chcę** śledzić posty LinkedIn z hashtagami AI/ML
**Aby** nie przegapić ciekawych dyskusji

**Kryteria akceptacji:**
- [ ] Input na cookie li_at w ustawieniach
- [ ] Konfiguracja hashtagów do śledzenia
- [ ] Posty wyświetlane razem z artykułami

---

### US7.3 - Twitter/X
**Jako** użytkownik
**Chcę** śledzić konta ekspertów AI na Twitterze
**Aby** być na bieżąco z ich opiniami

**Kryteria akceptacji:**
- [ ] Lista kont do śledzenia
- [ ] Pobieranie przez Nitter (bez logowania)
- [ ] Tweety wyświetlane jako karty

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

## Źródła

Wymagania oparte na analizie:
- [Zapier - Best News Apps 2025](https://zapier.com/blog/best-news-apps/)
- [Stfalcon - 10 Best News Apps](https://stfalcon.com/en/blog/post/10-best-news-apps)
- [OnStipe - News Aggregator Guide](https://onstipe.com/blog/10-best-news-aggregator-sites-in-2025-the-ultimate-guide/)

### Przykładowe źródła (konfigurowalne przez użytkownika)
- Blogi: Ethan Mollick, Benedict Evans, Simon Willison, Eugene Yan, Chip Huyen, Sebastian Raschka i inne
- Portale: strefainwestora.pl (wymaga logowania), inwestomat.eu
- Newslettery, social media (LinkedIn, Twitter/X)
