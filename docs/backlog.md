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
| TTS dla całego wydania | v2.8.0 |

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

### Editions# Leszek Newsroom AI - Backlog

**Wersja:** 1.1
**Data:** 2026-01-13
**Aktualna wersja aplikacji:** 2.8.0

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
| E9.1 | Tabela editions w Prisma | US9.1 | ✅ DONE | S |
| E9.2 | API GET /api/editions - lista wydań | US9.1 | ✅ DONE | S |
| E9.3 | API GET /api/editions/[id] - artykuły wydania | US9.1 | ✅ DONE | S |
| E9.4 | Strona /editions - lista wydań | US9.1 | ✅ DONE | M |
| E9.5 | Badge z liczbą nieprzeczytanych w wydaniu | US9.1 | ✅ DONE | S |
| E9.6 | Widok kalendarza/lista dat | US9.2 | 🔮 FUTURE | M |
| E9.7 | Cron job - tworzenie wydania o północy | US9.3 | ✅ DONE | M |
| E9.8 | Ustawienie: domyślny widok (Feed/Wydanie) | US9.3 | ✅ DONE | S |
| E9.9 | TTS dla całego wydania | US9.4 | ✅ DONE | M |

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
| T1.3 | TTS działający w tle na mobile | US2.3 | 📋 TODO | L |

---

## Completed (✅ DONE)

### Editions
| Feature | Version |
|---------|---------|
| Tabela editions z relacją do artykułów | v2.6.0 |
| API endpoints dla wydań | v2.6.0 |
| Strona /editions z listą i szczegółami | v2.6.0 |
| TTS dla całego wydania | v2.7.0 |

### Search & Pagination
| Feature | Version |
|---------|---------|

---

## Estimates Legend

| Size | Hours | Description |
|------|-------|-------------|
| S | 1-2h | Mała zmiana |
| M | 3-6h | Średnia zmiana |
| L | 8-16h | Duża zmiana |
