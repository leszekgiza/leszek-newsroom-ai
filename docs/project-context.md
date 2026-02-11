# Project Context - Leszek Newsroom AI (BMAD)

**Version:** 0.2
**Date:** 2026-02-09
**Status:** Draft (post-review update)

---

## Purpose
Provide a concise, code-verified snapshot of the current system to enable BMAD planning and gap analysis.

## Product Summary
- Newsreader that aggregates articles from multiple sources (v2.8.0).
- AI-generated 2-sentence intros and full summaries (LLM provider-agnostic).
- Text-to-speech (TTS) playback for summaries and editions.
- Two source types: shared catalog sources and per-user private sources.
- Daily editions with TTS playback.
- PWA with offline support (manifest, service worker, installable).
- SSE streaming for scraping progress.
- BYO keys, provider-agnostic LLM/TTS (OSS core, AGPL).
- **Planned evolution:** Conversational news agent (Q&A, Voice, Briefings).

## Primary Users
- People who follow many sources and need fast triage via summaries.
- Mobile-first users who prefer audio consumption.

## Current Architecture (As-Built)
- Next.js 16.1.1 App Router with React 19, TypeScript strict.
- Backend logic in API routes and lib services.
- PostgreSQL 15+ with Prisma 7.2, Full-Text Search (Polish).
- Crawl4AI scraping service in `scraper/` (Docker, Python FastAPI).
- Zustand 5 for state management, Tailwind CSS 4.
- Scheduled jobs for scraping and editions.
- 25 API routes, 6 services in lib/, 3 Zustand stores.

## Key Runtime Modules (Code)
- API routes: articles, sources, scrape, tts, editions, saved, trash, user preferences, cron.
- Services: AI summary, search (PostgreSQL FTS), scraping, editions.
- Stores/hooks/components for feed, search, TTS, preferences.

## Core Data Model (Prisma)
- User (with theme, defaultView, ttsVoice), Session
- CatalogSource, UserSubscription, HiddenCatalogSource
- PrivateSource (per-user, types: WEBSITE, GMAIL, LINKEDIN, TWITTER, RSS)
- Article (polymorphic source, editionId), SavedArticle, ReadArticle, DismissedArticle
- Edition (daily groupings, per-user)
- UserTopic (FUTURE: topic-based discovery)

## Main Flows (Current)
- Scrape -> extract -> AI intro/summary -> persist Article.
- Feed -> filter by source -> read/save/dismiss.
- FTS search over title/intro/summary (Polish language support).
- Editions generated daily and playable via TTS.
- SSE streaming for bulk scraping progress.

## External Dependencies
- Crawl4AI service (Docker) for scraping.
- LLM/TTS providers via BYO keys (provider-agnostic).
- Planned: Gmail (OAuth), LinkedIn (managed scraping), Twitter/X.

## Known Gaps / Inconsistencies (Resolved in v2.5 docs update)
- ~~Backlog shows app version 2.8.0, package.json is 2.0.0~~ FIXED: package.json updated to 2.8.0.
- `implementation-brief.md` marked TODO while backlog lists S0.1-0.3 as DONE (low priority).
- ~~HLD/LLD missing Editions, PWA, SSE sections~~ FIXED: ADR-006..009 added.
- ~~requirements.md missing F9-F13 for planned features~~ FIXED: F9-F13 added.

## Planned Evolution (Next Phases)
1. **Source Integrations** - Gmail newslettery, LinkedIn wall, X/Twitter feed (CONN.1-4, GMAIL.1-5, LNKD.1-5, XTWT.1-5) ← PRIORYTET #1
2. **Provider Abstraction Layer** - Unified LLM/TTS/STT interfaces (PAL.1-5) ✅ DONE (PAL.1-2, PAL.4-5)
3. **Text Q&A per Article** - OSS, BYO keys (QA.1-6)
4. **Topic-Clustered Briefings** - Premium (BRIEF.1-5)
5. **Voice STT** - Push-to-talk, Premium (VOICE.1-6)
6. **Multi-Article Q&A** - Premium (MULTI.1-4)

## Document Versions (Current)
| Document | Version | Date |
|----------|---------|------|
| requirements.md | 2.5 | 2026-02-09 |
| user-stories.md | 2.6 | 2026-02-09 |
| hld.md | 1.3 | 2026-02-09 |
| lld.md | 1.3 | 2026-02-09 |
| backlog.md | 1.3 | 2026-02-09 |
| oss-premium-split.md | 1.1 | 2026-02-09 |
