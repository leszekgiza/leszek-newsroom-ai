# OSS vs Premium Split Plan (AGPL + BYO keys)

**Status:** TODO (do realizacji)

## Cele
- Core OSS (AGPL) dziala samodzielnie i nie zalezy od premium
- Premium dostarcza hosting, integracje i wygode (bez wymogu BYO keys)
- Brak lock-in: interfejsy LLM/TTS sa provider-agnostic

## Zasady
- OSS nie importuje kodu premium
- Premium moze importowac core OSS
- Dostawcy w kodzie i dokumentacji sa tylko przykladami

## Proponowana struktura repo (mono-repo)
```
apps/
  web/                # OSS PWA (AGPL)
  worker/             # OSS background jobs (AGPL)
  premium-hosting/    # Hosting i billing (private)
packages/
  core/               # Wspolne modele, logika, utilsy (AGPL)
  providers/          # Adaptery LLM/TTS (AGPL, vendor-agnostic)
  premium/            # Dodatki premium (private)
```

## Granice funkcjonalne
**OSS (AGPL):**
- Scraping (Crawl4AI) + ingest
- Feed, editions, search, TTS (BYO keys)
- Q&A single-article (BYO keys)
- PWA mobile-first

**Premium (private):**
- Hosting + cache + SLA
- Integracje Gmail/LinkedIn/X (gotowe konektory)
- Multi-source Q&A i analityka
- Workspace i udostepnianie

## Plan migracji (kroki)
1. Wyodrebnic `packages/core` z logiki domenowej
2. Przeniesc adaptery LLM/TTS do `packages/providers`
3. Zbudowac `apps/web` jako konsument core
4. Dodac `apps/premium-hosting` jako osobny produkt

## Licensing
- Core OSS: AGPL-3.0-only
- Premium: proprietary / commercial license

