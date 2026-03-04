# Leszek Newsroom AI - Wytyczne dla Claude

## Opis projektu
Agregator newsow i blogow z AI streszczeniami i TTS. Celem jest oszczednosc czasu: sluchanie tresci, a docelowo rozmowa z artykulami (Q&A). Projekt ma byc open source (AGPL) z BYO keys oraz planem wersji premium.

---

## Struktura projektu

| Folder | Opis |
|--------|------|
| docs/ | Dokumentacja (requirements, hld, lld, user-stories, backlog, implementation-brief, oss-premium-split) |
| src/ | Aplikacja Next.js (App Router, API routes) |
| scraper/ | Python Crawl4AI microservice (Docker) |
| superdesign/ | Mockupy UI (HTML) |
| e2e/ | Testy E2E (Playwright) |
| public/ | Assety statyczne + PWA (manifest, ikony, sw.js) |

---

## Srodowisko

| Komponent | Lokalizacja |
|-----------|------------|
| Repozytorium | https://github.com/leszekgiza/leszek-newsroom-ai |
| Aplikacja | TBD (brak publicznego prod URL) |
| Baza danych | PostgreSQL (lokalnie przez DATABASE_URL) |
| Scraper | Lokalny Docker (domyslnie http://localhost:8000) |

---

## Konta testowe

Po `npm run db:seed`:
- test@example.com / Test123!

Nie zapisuj prywatnych kont ani hasel w repo.

---

## Kluczowe zasady

### 1. Dokumentacja przed implementacja
Zanim dodasz funkcjonalnosc:
1) Zaktualizuj `docs/requirements.md`
2) Zaktualizuj `docs/user-stories.md`
3) Zaktualizuj `docs/hld.md` i `docs/lld.md` (jesli zmiana dotyczy architektury)
4) Dopiero potem implementuj kod

### 2. Kontrola zmian (impact analysis)
Zmieniajac wymagania lub architekture, sprawdz wplyw na:
- requirements, user-stories, hld, lld
- backlog
- mockupy (superdesign/)
- kod i testy

Najpierw uzgodnij z uzytkownikiem zakres i ryzyko, potem wdrazaj.

### 3. Spajnosc artefaktow
- User story musi miec pokrycie w wymaganiach
- Mockupy musza odpowiadac user stories
- HLD/LLD musza byc zgodne z wymaganiami
- Kod musi byc zgodny z LLD

### 4. BYO keys + provider-agnostic (OSS)
- OSS nie zapewnia darmowych limitow LLM/TTS
- Uzytkownik dostarcza klucze (BYO)
- Dokumentacja ma byc vendor-agnostic

### 5. Jeden krok naraz
Implementuj pojedyncza funkcje -> test -> weryfikacja -> dopiero kolejna funkcja.

---

## Backlog

Zrodlo prawdy: `docs/backlog.md`.
Statusy: TODO / IN PROGRESS / DONE / FUTURE.
Zmiana statusu = aktualizacja backlogu.

---

## Testowanie

Strategia:
- E2E: Playwright (scenariusze uzytkownika)
- TypeScript: tsc
- Lint: ESLint

Polecane komendy:
```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run test:e2e
```

---

## PWA (dev)

Service worker domyslnie nie rejestruje sie w dev. Aby wlaczyc:
- ustaw `NEXT_PUBLIC_ENABLE_SW=true`

---

## Integracje (MVP-first)

Zasada YAGNI: brak abstrakcji przed 2-3 realnymi integracjami.
Najpierw osobne konektory, dopiero potem ewentualna baza wspolna.

---

## Git/GitHub

### Commity
- Granularne i opisowe
- Format: `type: krotki opis`
- Typy: feat, fix, docs, refactor, test, chore

### Push
- Push tylko na prosbe uzytkownika
- Przed pushem uruchom testy, jesli to ma sens

---

## OSS / Premium — Strategia dwoch repozytoriow

### Architektura
- **Prywatne repo** (`premium-newsroom`): zrodlo prawdy, CALY kod (OSS + Premium)
- **Publiczne repo** (`leszek-newsroom-ai`): automatyczny mirror, TYLKO kod OSS
- GitHub Action synchronizuje OSS przy kazdym push do master

### Gdzie umieszczac kod

| Typ | Lokalizacja | Repo |
|-----|------------|------|
| Kod premium | `src/premium/` | Tylko prywatne |
| Docs premium (implementacja) | `docs/premium/` | Tylko prywatne |
| Testy premium | `src/premium/__tests__/` | Tylko prywatne |
| E2E premium | `e2e/premium/` | Tylko prywatne |
| Env premium | `.env.premium.example` | Tylko prywatne |
| Wszystko inne | Normalna struktura | Oba repozytoria |

### Reguly
1. OSS NIE importuje z `src/premium/` — ESLint to blokuje
2. Premium MOZE importowac z OSS
3. Testy OSS MUSZA przechodzic BEZ `src/premium/` (`npm run test:oss`)
4. Push -> prywatne repo -> automatyczny sync do publicznego
5. Nigdy nie push recznie do publicznego repo

### Dla Claude Code — decyzja gdzie umiescic kod
- Feature Matrix: `docs/oss-premium-split.md`
- Funkcja oznaczona "Premium" -> `src/premium/`
- Funkcja OSS -> normalna struktura
- W razie watpliwosci -> zapytaj uzytkownika

---

## Zrodla konfiguracji

- `.env.example` jest zrodlem prawdy dla zmiennych OSS
- `.env.premium.example` jest zrodlem prawdy dla zmiennych Premium
- Nie commituj prawdziwych kluczy i hasel

---

## Przydatne komendy

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:migrate
npm run db:seed
npm run test:e2e
```
