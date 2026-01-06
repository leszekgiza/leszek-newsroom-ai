# Changelog

Wszystkie istotne zmiany w projekcie Newsroom AI.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

---

## [Unreleased]

### Added
- **PostgreSQL Full-Text Search (FTS)** z obsługą języka polskiego
  - Nowa migracja `20260106120000_add_fts_polish` dodająca:
    - Rozszerzenie `unaccent` dla normalizacji polskich znaków diakrytycznych
    - Custom konfiguracja `polish_simple` dla FTS
    - Kolumna `search_vector` (tsvector) w tabeli `articles`
    - Indeks GIN dla szybkiego wyszukiwania pełnotekstowego
    - Trigger automatycznie aktualizujący wektory przy INSERT/UPDATE
  - Nowy serwis `src/lib/searchService.ts`:
    - Wyszukiwanie z wagami pól (A=tytuł, B=intro, C=summary)
    - Prefix matching (`agent` znajduje `agents`, `agentic`)
    - Ranking wyników po relevance (`ts_rank_cd`)
    - Highlights z tagami `<mark>` (`ts_headline`)
  - Zmodyfikowane API `/api/articles`:
    - Branch FTS dla zapytań >= 2 znaki
    - Zwraca `relevance` i `highlight` w response
    - Zachowana kompatybilność wsteczna (bez search = Prisma query)
  - Style CSS dla podświetlania wyników wyszukiwania (`<mark>`)
  - Export `pool` z `src/lib/prisma.ts` dla raw SQL queries

### Technical Details
- Użyto `to_tsquery` z prefix matching (`:*`) zamiast `plainto_tsquery`
- Konfiguracja `polish_simple` bazuje na słowniku `simple` + `unaccent`
- Wspólny Pool dla Prisma i raw SQL (unikanie wyczerpania połączeń)

---

## [0.1.0] - 2025-01-XX

### Added
- Inicjalna wersja Newsroom AI
- System użytkowników i autoryzacji (email + hasło)
- Źródła katalogowe (CatalogSource) i prywatne (PrivateSource)
- Artykuły z AI-generowanymi podsumowaniami
- Subskrypcje użytkowników
- Zapisywanie, oznaczanie jako przeczytane, odrzucanie artykułów
- Ukrywanie źródeł
- Podstawowy interfejs użytkownika (Next.js + Tailwind)
