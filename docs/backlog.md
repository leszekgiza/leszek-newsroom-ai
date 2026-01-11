# Leszek Newsroom AI - Backlog

**Wersja:** 1.0
**Data:** 2026-01-11
**Aktualna wersja aplikacji:** 2.6.0

---

## Status Legend

| Status | Opis |
|--------|------|
| ✅ DONE | Zaimplementowane i przetestowane |
| 🚧 IN PROGRESS | W trakcie implementacji |
| 📋 TODO | Do zrobienia |
| 🔮 FUTURE | Planowane na przyszłość (v3.0+) |

---

## Sprint Backlog (Priorytet: MUST/SHOULD)

### 1. Wydania (Editions) - Epic 9 [SHOULD] ✅ DONE
**Cel:** Codzienne grupowanie artykułów jak w gazecie

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| E9.1 | Tabela `editions` w Prisma | US9.1 | ✅ DONE | S |
| E9.2 | API `GET /api/editions` - lista wydań | US9.1 | ✅ DONE | S |
| E9.3 | API `GET /api/editions/[id]` - artykuły wydania | US9.1 | ✅ DONE | S |
| E9.4 | Strona `/editions` - lista wydań | US9.1 | ✅ DONE | M |
| E9.5 | Badge z liczbą nieprzeczytanych w wydaniu | US9.1 | ✅ DONE | S |
| E9.6 | Widok kalendarza/lista dat | US9.2 | 📋 TODO | M |
| E9.7 | Cron job - tworzenie wydania o północy | US9.3 | ✅ DONE | M |
| E9.8 | Ustawienie: domyślny widok (Feed/Wydanie) | US9.3 | 📋 TODO | S |

### 2. Wyszukiwanie PostgreSQL FTS [MUST] ✅ DONE
**Cel:** Pełnotekstowe wyszukiwanie z obsługą języka polskiego

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| S1.1 | Migracja: kolumna `search_vector` tsvector | US3.3 | ✅ DONE | S |
| S1.2 | Indeks GIN dla wyszukiwania | US3.3 | ✅ DONE | S |
| S1.3 | Trigger do aktualizacji search_vector | US3.3 | ✅ DONE | M |
| S1.4 | API `GET /api/articles?search=...` | US3.3 | ✅ DONE | M |
| S1.5 | UI: pole wyszukiwania (mobile + desktop) | US3.3 | ✅ DONE | M |
| S1.6 | Live search z debounce 300ms | US3.3 | ✅ DONE | S |
| S1.7 | Podświetlanie dopasowanych fragmentów | US3.3 | ✅ DONE | M |

### 3. Infinite Scroll / Paginacja [MUST]
**Cel:** Obsługa dużej liczby artykułów

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| P1.1 | API: paginacja w `/api/articles` | US1.1 | 📋 TODO | S |
| P1.2 | Infinite scroll component | US1.1 | 📋 TODO | M |
| P1.3 | Loading skeleton podczas ładowania | US1.1 | 📋 TODO | S |

### 4. Filtrowanie po źródle - ulepszenia [MUST]
**Cel:** Pełna funkcjonalność filtrowania

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| F1.1 | Dropdown z listą źródeł | US1.2 | 📋 TODO | M |
| F1.2 | Licznik artykułów przy każdym źródle | US1.2 | 📋 TODO | S |
| F1.3 | Zachowanie filtru po odświeżeniu (URL params) | US1.2 | 📋 TODO | S |

### 5. TTS - wybór głosu [SHOULD]
**Cel:** Personalizacja głosu TTS

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| T1.1 | UI: wybór głosu w ustawieniach | US2.3 | 📋 TODO | M |
| T1.2 | Zapisywanie preferencji głosu w DB | US2.3 | 📋 TODO | S |
| T1.3 | TTS działający w tle na mobile | US2.3 | 📋 TODO | L |

---

## Product Backlog (SHOULD/COULD)

### 6. Gmail Integration [SHOULD]
**Cel:** Pobieranie newsletterów z Gmail

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| G1.1 | OAuth2 flow dla Gmail | US7.1 | 📋 TODO | L |
| G1.2 | UI: "Połącz Gmail" w ustawieniach | US7.1 | 📋 TODO | M |
| G1.3 | Konfiguracja: od kogo pobierać | US7.1 | 📋 TODO | M |
| G1.4 | Pobieranie i parsowanie emaili | US7.1 | 📋 TODO | L |
| G1.5 | Wyświetlanie newsletterów jako artykuły | US7.1 | 📋 TODO | M |

### 7. LinkedIn Integration [SHOULD]
**Cel:** Śledzenie postów ekspertów

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| L1.1 | UI: input na cookie li_at | US7.2 | 📋 TODO | S |
| L1.2 | Konfiguracja hashtagów do śledzenia | US7.2 | 📋 TODO | M |
| L1.3 | Scraping postów LinkedIn | US7.2 | 📋 TODO | L |
| L1.4 | Wyświetlanie postów jako artykuły | US7.2 | 📋 TODO | M |

### 8. Logowanie do stron chronionych [SHOULD]
**Cel:** Scraping stron z paywallem

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| A1.1 | UI: formularz credentials w źródłach | US4.5 | 📋 TODO | M |
| A1.2 | Szyfrowanie credentials (AES-256) | US4.5 | 📋 TODO | M |
| A1.3 | Scraper: logowanie przed scrapingiem | US4.5 | 📋 TODO | L |
| A1.4 | Test połączenia przed zapisaniem | US4.5 | 📋 TODO | M |

### 9. Automatyczne odświeżanie [MUST]
**Cel:** Automatyczne pobieranie nowych artykułów

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| R1.1 | Cron job dla scrapowania źródeł | F1.5 | 📋 TODO | M |
| R1.2 | Konfiguracja interwału (co X minut) | F1.5 | 📋 TODO | S |
| R1.3 | UI: status ostatniego scrapowania | F1.5 | 📋 TODO | S |

### 10. Reset hasła [SHOULD]
**Cel:** Odzyskiwanie dostępu do konta

| ID | Zadanie | Story | Status | Estimate |
|----|---------|-------|--------|----------|
| RP1.1 | API: generowanie tokena resetu | US5.4 | 📋 TODO | M |
| RP1.2 | Wysyłanie emaila z linkiem | US5.4 | 📋 TODO | M |
| RP1.3 | UI: formularz nowego hasła | US5.4 | 📋 TODO | S |

---

## Future Backlog (v3.0+) [COULD/WON'T]

### 11. Twitter/X via Nitter [COULD]
| ID | Zadanie | Story | Status |
|----|---------|-------|--------|
| TW1.1 | Lista kont do śledzenia | US7.3 | 🔮 FUTURE |
| TW1.2 | Scraping przez Nitter | US7.3 | 🔮 FUTURE |
| TW1.3 | Wyświetlanie tweetów | US7.3 | 🔮 FUTURE |

### 12. AI Voice Chatbot [COULD]
| ID | Zadanie | Story | Status |
|----|---------|-------|--------|
| VC1.1 | Speech-to-Text integration | US8.2 | 🔮 FUTURE |
| VC1.2 | Rozmowa o artykule (kontekst) | US8.2 | 🔮 FUTURE |
| VC1.3 | Historia rozmowy | US8.2 | 🔮 FUTURE |

### 13. Offline Reading [COULD]
| ID | Zadanie | Story | Status |
|----|---------|-------|--------|
| OF1.1 | Service Worker | US8.1 | 🔮 FUTURE |
| OF1.2 | Cache artykułów | US8.1 | 🔮 FUTURE |
| OF1.3 | Sync po powrocie online | US8.1 | 🔮 FUTURE |

### 14. Topic-based Discovery [COULD]
| ID | Zadanie | Story | Status |
|----|---------|-------|--------|
| TD1.1 | User definiuje tematy | - | 🔮 FUTURE |
| TD1.2 | AI szuka w internecie | - | 🔮 FUTURE |
| TD1.3 | Dzienny podcast z podsumowaniem | - | 🔮 FUTURE |

---

## Completed (✅ DONE)

### Editions
| Feature | Version | Requirements |
|---------|---------|--------------|
| Tabela editions z relacją do artykułów | v2.6.0 | F8.1, US9.1 |
| API endpoints dla wydań | v2.6.0 | F8.2 |
| Strona /editions z listą i szczegółami | v2.6.0 | F8.3 |
| AI-generowane podsumowania wydań | v2.6.0 | F8.1 |
| CRON dla automatycznego tworzenia wydań | v2.6.0 | F8.5 |

### Search
| Feature | Version | Requirements |
|---------|---------|--------------|
| PostgreSQL Full-Text Search (FTS) | v2.6.0 | F3.4, US3.3 |
| Wyszukiwanie z obsługą j. polskiego | v2.6.0 | F3.4 |
| Prefix matching i ranking | v2.6.0 | F3.4 |
| Podświetlanie wyników (highlights) | v2.6.0 | F3.4 |

### Core Features
| Feature | Version | Requirements |
|---------|---------|--------------|
| Lista artykułów z kartami | v2.1.0 | US1.1 |
| 2-zdaniowe intro (AI) | v2.2.0 | US2.1, F2.1 |
| Pełne streszczenie AI (200-300 słów) | v2.2.0 | US2.2, F2.2 |
| Auto-regeneracja streszczenia | v2.2.0 | F2.2.1, F2.2.2 |
| TTS (edge-tts-universal) | v2.1.1 | US2.3, F2.3 |
| Badge NEW | v2.1.0 | US1.3, F2.5 |
| Sortowanie wg daty publikacji | v2.5.1 | F3.8 |
| Wyświetlanie daty publikacji | v2.5.1 | F1.7, F1.8 |

### Organization
| Feature | Version | Requirements |
|---------|---------|--------------|
| Zapisywanie artykułów | v1.0.0 | US3.1, F3.1 |
| Usuwanie zapisanych | v1.0.0 | US3.2, F3.2 |
| Kosz / "Nie interesuje mnie" | v2.3.0 | US3.4, F3.6, F3.7 |
| Przywracanie z kosza | v2.3.0 | US3.4 |

### Sources
| Feature | Version | Requirements |
|---------|---------|--------------|
| Zarządzanie źródłami (CRUD) | v2.4.0 | US4.1, US4.3, F4.2, F4.3 |
| Dodawanie własnych źródeł | v2.4.0 | US4.1, F4.2 |
| Włączanie/wyłączanie źródeł | v2.4.0 | US4.3 |
| Subskrypcje źródeł z katalogu | v2.4.0 | - |
| Ujednolicony UI (toggle switch) | v2.6.0 | F4.3 |
| Scraping (Crawl4AI) | v2.5.0 | F1.1 |

### Auth & UX
| Feature | Version | Requirements |
|---------|---------|--------------|
| Rejestracja | v2.0.0 | US5.1, F5.1 |
| Logowanie (email/hasło) | v2.0.0 | US5.2, F5.2 |
| Wylogowanie | v2.0.0 | US5.3, F5.3 |
| Dark/Light theme | v2.1.0 | US6.1, F4.7 |
| Responsive layout (mobile + desktop) | v2.1.0 | US6.2, NF2.* |
| Bottom navigation (mobile) | v2.1.0 | US6.2 |
| Sidebar (desktop) | v2.1.0 | - |

---

## Estimates Legend

| Size | Hours | Description |
|------|-------|-------------|
| S | 1-2h | Mała zmiana, pojedynczy plik |
| M | 3-6h | Średnia zmiana, kilka plików |
| L | 8-16h | Duża zmiana, nowy moduł |
| XL | 16h+ | Epic, wymaga rozbicia |

---

## Prioritization (MoSCoW)

### MUST (MVP) - Brakujące
1. ~~Wyszukiwanie PostgreSQL FTS~~ (S1.*) ✅ DONE
2. ~~Infinite scroll / paginacja~~ (P1.*)
3. ~~Automatyczne odświeżanie~~ (R1.*)

### SHOULD - Następne
1. ~~Wydania (Editions)~~ (E9.*) ✅ DONE
2. Gmail integration (G1.*)
3. LinkedIn integration (L1.*)
4. Reset hasła (RP1.*)
5. TTS wybór głosu (T1.*)

### COULD - Później
1. Twitter/X via Nitter
2. AI Voice Chatbot
3. Offline Reading

### WON'T (na razie)
- Internacjonalizacja (i18n)
- Export do PDF
- Aplikacja mobilna natywna
