# Implementation Brief - Points 1-3 (OSS + Premium)

**Status:** TODO (do realizacji)
**Scope:** Dokumentacja i backlog dla punktow 1, 2, 3 oraz zasada niezaleznosci.

---

## Zasada niezaleznosci (kluczowa)
- Core OSS musi byc niezalezny od dostawcy LLM/TTS.
- Uzytkownik OSS sam dostarcza klucze (BYO keys). Brak "free tier".
- W dokumentacji i interfejsach uzywamy neutralnych nazw (np. `LLM_PROVIDER`, `LLM_API_KEY`, `TTS_PROVIDER`).
- Dostawcy (np. Anthropic, OpenAI, local models) sa tylko przykladami, nie zaleznoscia.

---

## Punkt 1 - Doc alignment + independence
**Cel:** Spisac i ujednolicic dokumentacje tak, aby dowolny model/zespol mogl wdrozyc zmiany bez vendor lock-in.

**Do zrobienia (TODO):**
1. Ujednolicic stack i wersje w `README.md`, `docs/requirements.md`, `docs/hld.md`, `docs/lld.md`.
2. Wpisac AGPL jako licencje oraz opisac obowiazki licencyjne.
3. Uaktualnic sekcje auth (custom JWT cookie), scraping (Crawl4AI service), env vars (SCRAPER_URL).
4. Dodac jawny opis BYO keys (LLM/TTS) i kosztow.
5. Dodac sekcje "Provider-agnostic" w wymaganiach niefunkcjonalnych.

**Definition of Done:**
- Dokumentacja spójna z kodem i bez sprzecznosci.
- Neutralne nazwy providerow w dokumentacji core.
- Jasny opis BYO keys i braku finansowania kosztow w OSS.

---

## Punkt 2 - PWA MVP + Q&A backlog
**Cel:** Zrobic PWA MVP (mobile-first) i podstawowe Q&A do jednego artykulu.

**PWA MVP (TODO):**
- Manifest + ikony + install prompt.
- Offline cache dla listy/edycji (minimalny zakres).
- Media Session + poprawny background audio (mobile).
- Mobile UX: szybkie odtwarzanie, prosty onboarding.

**Q&A single article (TODO):**
- Kontekst = tresc artykulu + streszczenie.
- UI czatu (mobile-first).
- Odpowiedzi w jezyku uzytkownika.
- Cache odpowiedzi i limit kosztow (BYO keys).

**Definition of Done:**
- PWA instalowalne na Android/iOS (przynajmniej "Add to Home Screen").
- Q&A dziala dla pojedynczego artykulu bez vendor lock-in (dowolny LLM).

---

## Punkt 3 - OSS/Premium repo split plan
**Cel:** Zaplanowac podzial kodu i granice licencyjne (AGPL core + premium addons).

**Propozycja (TODO):**
- `apps/web` - OSS PWA (AGPL)
- `apps/worker` - OSS worker (AGPL)
- `packages/core` - wspolny core (AGPL)
- `apps/premium-hosting` - hosting + integracje (private)
- `packages/premium` - dodatki premium (private)

**Zasady:**
- OSS core nie zalezy od premium.
- Premium moze korzystac z core, ale nie odwrotnie.
- Integracje wymagajace kluczy/platnosci po stronie dostawcy sa w premium.

**Definition of Done:**
- Jasny opis granic i licencji.
- Opis co jest OSS, co premium, i jak je rozdzielic w repo.

---

## Materialy wejsciowe (aktualny kod)
- Next.js app + API routes (monolith)
- Crawl4AI service (Python)
- Postgres + Prisma
- Auth: custom JWT cookie
- TTS: Edge TTS (jako przyklad)
- LLM: Claude (jako przyklad)

