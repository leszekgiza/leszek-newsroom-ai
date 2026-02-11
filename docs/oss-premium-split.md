# OSS vs Premium Split Plan (AGPL + BYO keys)

**Wersja:** 1.1
**Data:** 2026-02-09
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

## Feature Matrix

| Feature | OSS (AGPL, BYO keys) | Premium (Managed) |
|---------|----------------------|-------------------|
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

## Proponowana struktura repo (mono-repo)
```
apps/
  web/                # OSS PWA (AGPL)
  worker/             # OSS background jobs (AGPL)
  premium-hosting/    # Hosting i billing (private)
packages/
  core/               # Wspolne modele, logika, utilsy (AGPL)
  providers/          # Adaptery LLM/TTS/STT (AGPL, vendor-agnostic)
  premium/            # Dodatki premium (private)
```

## Plan migracji (kroki)
1. Wyodrebnic `packages/core` z logiki domenowej
2. Przeniesc adaptery LLM/TTS do `packages/providers`
3. Dodac STT adapter do `packages/providers`
4. Zbudowac `apps/web` jako konsument core
5. Dodac `apps/premium-hosting` jako osobny produkt
6. Implementacja feature flags (env-based) dla OSS/Premium boundary

## Licensing
- Core OSS: AGPL-3.0-only
- Premium: proprietary / commercial license
