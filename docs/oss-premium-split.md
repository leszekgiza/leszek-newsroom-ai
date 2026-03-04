# OSS vs Premium Split Plan (AGPL + BYO keys)

**Wersja:** 2.0
**Data:** 2026-03-04
**Status:** Draft

## Cele
- Core OSS (AGPL) dziala samodzielnie i nie zalezy od premium
- Premium dostarcza hosting, integracje i wygode (bez wymogu BYO keys)
- Brak lock-in: interfejsy LLM/TTS sa provider-agnostic

## Zasady
- OSS nie importuje kodu premium
- Premium moze importowac core OSS
- Dostawcy w kodzie i dokumentacji sa tylko przykladami
- Feature flags (nie repo split) do rozrozniania OSS/Premium w runtime

## Naming Convention
- **Newsroom AI Free** — wersja OSS (AGPL, BYO keys, self-hosted)
- **Newsroom AI** — wersja Premium (managed hosting, zero konfiguracji)

## Feature Matrix

| Feature | Newsroom AI Free (AGPL, BYO keys) | Newsroom AI (Managed) |
|---------|----------------------|-------------------|
| **Landing Page + i18n** | Yes | Yes |
| **Scraping (Crawl4AI)** | Yes | Yes |
| **Feed + Editions** | Yes | Yes |
| **AI Intro + Summary (LLM)** | BYO keys | Managed |
| **TTS (article + edition)** | BYO keys | Managed |
| **Search (PostgreSQL FTS)** | Yes | Yes |
| **PWA (offline, install)** | Yes | Yes |
| **SSE scraping progress** | Yes | Yes |
| **Text Q&A per article** | BYO keys | Managed |
| **Voice STT (push-to-talk)** | - | Yes |
| **Topic-clustered Briefings** | - | Yes |
| **Multi-Article Q&A** | - | Yes |
| **Gmail connector** | - | Yes (managed OAuth) |
| **LinkedIn connector** | - | Yes (managed scraping) |
| **Twitter/X connector** | - | Yes (managed) |
| **Hosting + SLA** | Self-hosted | Managed |
| **Analytics + usage tracking** | - | Yes |
| **Workspace + sharing** | - | Yes |

## Granice funkcjonalne

**OSS (AGPL):**
- Scraping (Crawl4AI) + ingest
- Feed, editions, search, TTS (BYO keys)
- Q&A single-article (BYO keys)
- PWA mobile-first
- Provider Abstraction Layer (LLM/TTS/STT interfaces)

**Premium (private):**
- Hosting + cache + SLA
- Integracje Gmail/LinkedIn/X (gotowe konektory)
- Voice STT (push-to-talk)
- Topic-clustered Briefings
- Multi-source Q&A i analityka
- Workspace i udostepnianie

## Struktura katalogow

```
D:\Projekty\Blog\
  docs/                        <- OSS docs (publiczne)
    premium/                   <- Premium docs implementacyjne (prywatne)
  src/
    app/                       <- OSS routes
    components/                <- OSS components
    lib/                       <- OSS logic
      featureFlags.ts          <- OSS/Premium boundary (runtime)
    i18n/                      <- OSS i18n
    __tests__/                 <- OSS testy
    middleware.ts              <- OSS middleware
    premium/                   <- CALY kod premium (prywatne)
      components/              <- Premium UI
      app/                     <- Premium routes (API + pages)
      lib/                     <- Premium logika
      __tests__/               <- Premium testy
      LICENSE-PREMIUM          <- Licencja komercyjna
  e2e/                         <- OSS E2E testy
    premium/                   <- Premium E2E testy (prywatne)
  scraper/                     <- OSS Python microservice
  prisma/                      <- OSS schema
  .github/
    workflows/
      sync-oss.yml             <- GitHub Action sync (prywatne, nie kopiowana)
```

## Strategia dwoch repozytoriow (Private Source -> Public Mirror)

### Model pracy

```
Programista ──push──> [Prywatne repo]     ──GitHub Action──> [Publiczne repo]
                      premium-newsroom                   leszek-newsroom-ai
                      (zrodlo prawdy)                        (mirror OSS)
                      OSS + Premium                          tylko OSS
```

Pracujesz ZAWSZE z jednym repo (prywatnym). Jedno `git push`. GitHub Action automatycznie synchronizuje kod OSS do publicznego repo. Nigdy nie pushjesz recznie do publicznego.

### Konwencja katalogow

Regula zlota: Wszystko poza `premium/` = OSS.

```
src/
  premium/               <- CALY kod premium (prywatne repo only)
    components/          <- Premium UI
    app/                 <- Premium routes (API + pages)
    lib/                 <- Premium logika
    __tests__/           <- Premium testy
docs/
  premium/               <- Premium docs implementacyjne (prywatne repo only)
e2e/
  premium/               <- Premium E2E testy (prywatne repo only)
```

GitHub Action przy sync usuwa:
- `src/premium/`
- `docs/premium/`
- `packages/premium/`
- `e2e/premium/`
- `.env.premium.example`
- `.github/workflows/sync-oss.yml` (sam siebie)

### Dokumentacja dwupoziomowa

**Poziom 1 — `docs/` (publiczne, oba repo):**
Opisy premium features ZOSTAJA w publicznych docs jako roadmap/marketing. Community korzysta z wiedzy co jest planowane.

**Poziom 2 — `docs/premium/` (tylko prywatne repo):**
Szczegoly IMPLEMENTACJI premium — jak budujemy, nie co budujemy:
- `requirements-premium.md` — szczegolowe wymagania techniczne
- `lld-premium.md` — architektura wewnetrzna: billing, multi-tenant
- `backlog-premium.md` — szczegolowy backlog z estimates
- `api-premium.md` — API endpoints premium
- `infrastructure.md` — managed hosting, CI/CD, monitoring

### Testy

```
npm test          # WSZYSTKIE testy (prywatne repo, CI)
npm run test:oss  # Tylko testy OSS (weryfikacja przed sync)
npm run test:premium  # Tylko testy premium
```

### ESLint boundary

OSS kod nie moze importowac z `src/premium/` — ESLint rule `no-restricted-imports` to egzekwuje. Premium kod moze importowac z OSS.

### Feature flags

```env
PREMIUM_ENABLED=false   # OSS: false, Premium: true
```

```typescript
// src/lib/featureFlags.ts (OSS)
export const isPremiumEnabled = () => process.env.PREMIUM_ENABLED === 'true';
```

### CI/CD

| Repo | Jakie testy | Kiedy |
|------|-------------|-------|
| Prywatne | `npm test` (wszystkie) | Na kazdy push |
| Prywatne | `npm run test:oss` (OSS only) | Przed sync do publicznego |
| Publiczne | `npm test` (= tylko OSS) | Na kazdy push/PR |

### Baza danych (Prisma)

Jedna schema dla obu. Premium modele oznaczone komentarzem `// Premium`. Gdy premium rosnie, mozna przejsc na Prisma Multi-file Schema (5.15+).

## Licensing
- Core OSS: AGPL-3.0-only
- Premium: proprietary / commercial license
- `src/premium/LICENSE-PREMIUM`: oddzielna licencja komercyjna
