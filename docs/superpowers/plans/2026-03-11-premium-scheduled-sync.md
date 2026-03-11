# Premium Scheduled Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatyczne pobieranie artykułów CRON-em wg harmonogramu premium usera, z auto-tworzeniem edition.

**Architecture:** CRON endpoint (`GET /api/cron/scrape-scheduled`) wywoływany co minutę przez systemowy crontab. Endpoint sprawdza którzy premium userzy potrzebują sync w danej minucie (na podstawie syncHour/syncDays/syncTimezone), przetwarza ich sekwencyjnie reużywając istniejący pipeline scrapingu, i tworzy edition po zakończeniu. Kod premium w `src/premium/`, tier gate via feature flag.

**Tech Stack:** Next.js 16.1.1 (App Router), Prisma 7.2, TypeScript strict, Jest, Winston logging

**PRD:** `_bmad/bmm/planning-artifacts/prd.md`
**Backlog:** SCHED.1-6 w `docs/backlog.md`
**ADR:** ADR-014 w `docs/hld.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/premium/lib/scheduledSyncService.ts` | Core logic: find eligible users, run sync per user, logging |
| Create | `src/premium/lib/__tests__/scheduledSyncService.test.ts` | Unit tests for sync service |
| Create | `src/app/api/cron/scrape-scheduled/route.ts` | HTTP cron endpoint (thin wrapper) |
| Create | `src/app/api/cron/scrape-scheduled/__tests__/route.test.ts` | Endpoint tests |
| Modify | `prisma/schema.prisma` | Add sync fields to User model |
| Create | `prisma/migrations/YYYYMMDD_add_scheduled_sync_fields/migration.sql` | DB migration (auto-generated) |

---

## Chunk 1: Database Schema + Sync Service

### Task 1: Prisma Migration — Add sync fields to User model

**Files:**
- Modify: `prisma/schema.prisma` (User model, lines 16-44)

- [ ] **Step 1: Add sync fields to User model in schema.prisma**

Add after `briefingTime` field (line 27):

```prisma
  // Scheduled Sync (Premium)
  syncEnabled       Boolean   @default(true)
  syncHour          Int       @default(6)
  syncDays          String    @default("1,2,3,4,5")  // comma-separated day-of-week (1=Mon, 7=Sun)
  syncTimezone      String    @default("UTC")         // IANA timezone
  lastScheduledSync DateTime?
```

- [ ] **Step 2: Generate and apply migration**

Run:
```bash
npx prisma migrate dev --name add_scheduled_sync_fields
```
Expected: Migration created, `prisma/migrations/YYYYMMDD_add_scheduled_sync_fields/migration.sql` generated, DB updated.

- [ ] **Step 3: Verify Prisma client regenerated**

Run:
```bash
npx prisma generate
```
Expected: Prisma Client generated successfully.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(premium): add scheduled sync fields to User model (SCHED.2, SCHED.3)"
```

---

### Task 2: ScheduledSyncService — Core logic (TDD)

**Files:**
- Create: `src/premium/lib/scheduledSyncService.ts`
- Create: `src/premium/lib/__tests__/scheduledSyncService.test.ts`

**References:**
- Existing scrape trigger: `src/app/api/scrape/trigger/route.ts` (pipeline pattern)
- Edition service: `src/lib/editionService.ts` (`addArticleToEdition`, `getOrCreateEdition`)
- Scrape service: `src/lib/scrapeService.ts` (`scrapeArticlesList`, `scrapeUrl`, `checkScraperHealth`)
- AI service: `src/lib/aiService.ts` (`generatePolishIntro`)
- Connector factory: `src/lib/connectors/factory.ts` (`getConnector`)
- Feature flags: `src/lib/featureFlags.ts` (`isPremiumEnabled`)
- Cron pattern: `src/app/api/cron/editions/route.ts` (CRON_SECRET auth)

- [ ] **Step 1: Write test — `isUserDueForSync` determines if user needs sync now**

Create `src/premium/lib/__tests__/scheduledSyncService.test.ts`:

```typescript
// Copyright (c) Leszek Giza. Commercial license — see src/premium/LICENSE-PREMIUM

import { isUserDueForSync } from '../scheduledSyncService';

describe('isUserDueForSync', () => {
  const baseUser = {
    id: 'user-1',
    syncEnabled: true,
    syncHour: 6,
    syncDays: '1,2,3,4,5', // Mon-Fri
    syncTimezone: 'Europe/Warsaw',
    lastScheduledSync: null as Date | null,
  };

  it('returns true when sync is enabled, correct hour/day, and no sync today', () => {
    // Monday 6:00 Warsaw = 5:00 UTC in winter (CET=UTC+1)
    // Use a fixed Monday date: 2026-03-09 is Monday
    const now = new Date('2026-03-09T05:00:00Z'); // 6:00 Warsaw (CET)
    const result = isUserDueForSync(baseUser, now);
    expect(result).toBe(true);
  });

  it('returns false when sync is disabled', () => {
    const user = { ...baseUser, syncEnabled: false };
    const now = new Date('2026-03-09T05:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(false);
  });

  it('returns false when today is not in syncDays', () => {
    // Sunday = day 7, syncDays = '1,2,3,4,5' (Mon-Fri)
    const now = new Date('2026-03-08T05:00:00Z'); // Sunday
    expect(isUserDueForSync(baseUser, now)).toBe(false);
  });

  it('returns false when current hour does not match syncHour in user timezone', () => {
    const now = new Date('2026-03-09T10:00:00Z'); // 11:00 Warsaw, not 6:00
    expect(isUserDueForSync(baseUser, now)).toBe(false);
  });

  it('returns false when user already synced today', () => {
    const user = {
      ...baseUser,
      lastScheduledSync: new Date('2026-03-09T05:05:00Z'), // already synced today
    };
    const now = new Date('2026-03-09T05:30:00Z');
    expect(isUserDueForSync(user, now)).toBe(false);
  });

  it('returns true when last sync was yesterday', () => {
    const user = {
      ...baseUser,
      lastScheduledSync: new Date('2026-03-08T05:00:00Z'), // yesterday
    };
    const now = new Date('2026-03-09T05:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(true);
  });

  it('handles UTC timezone correctly', () => {
    const user = { ...baseUser, syncTimezone: 'UTC', syncHour: 6 };
    const now = new Date('2026-03-09T06:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/premium/lib/__tests__/scheduledSyncService.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '../scheduledSyncService'`

- [ ] **Step 3: Implement `isUserDueForSync`**

Create `src/premium/lib/scheduledSyncService.ts`:

```typescript
// Copyright (c) Leszek Giza. Commercial license — see src/premium/LICENSE-PREMIUM

interface SyncUser {
  id: string;
  syncEnabled: boolean;
  syncHour: number;
  syncDays: string;
  syncTimezone: string;
  lastScheduledSync: Date | null;
}

/**
 * Check if a user is due for scheduled sync at the given time.
 * Compares current hour in user's timezone with syncHour,
 * checks day-of-week, and ensures no sync already happened today.
 */
export function isUserDueForSync(user: SyncUser, now: Date): boolean {
  if (!user.syncEnabled) return false;

  // Convert current time to user's timezone
  const userNow = new Date(now.toLocaleString('en-US', { timeZone: user.syncTimezone }));
  const userHour = userNow.getHours();
  const userDayOfWeek = userNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Convert JS day (0=Sun) to our format (1=Mon, 7=Sun)
  const dayNumber = userDayOfWeek === 0 ? 7 : userDayOfWeek;

  // Check if current hour matches
  if (userHour !== user.syncHour) return false;

  // Check if today's day is in syncDays
  const allowedDays = user.syncDays.split(',').map(d => parseInt(d.trim(), 10));
  if (!allowedDays.includes(dayNumber)) return false;

  // Check if already synced today (in user's timezone)
  if (user.lastScheduledSync) {
    const lastSyncLocal = new Date(
      user.lastScheduledSync.toLocaleString('en-US', { timeZone: user.syncTimezone })
    );
    if (
      lastSyncLocal.getFullYear() === userNow.getFullYear() &&
      lastSyncLocal.getMonth() === userNow.getMonth() &&
      lastSyncLocal.getDate() === userNow.getDate()
    ) {
      return false; // Already synced today
    }
  }

  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/premium/lib/__tests__/scheduledSyncService.test.ts --no-coverage`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/premium/lib/scheduledSyncService.ts src/premium/lib/__tests__/scheduledSyncService.test.ts
git commit -m "feat(premium): add isUserDueForSync with TDD tests (SCHED.1)"
```

---

### Task 3: ScheduledSyncService — `syncSourcesForUser` function (TDD)

**Files:**
- Modify: `src/premium/lib/scheduledSyncService.ts`
- Modify: `src/premium/lib/__tests__/scheduledSyncService.test.ts`

- [ ] **Step 1: Write test — `syncSourcesForUser` syncs all sources and returns stats**

Append to `src/premium/lib/__tests__/scheduledSyncService.test.ts`:

```typescript
import { syncSourcesForUser } from '../scheduledSyncService';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    privateSource: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    userSubscription: {
      findMany: jest.fn(),
    },
    catalogSource: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    article: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/scrapeService', () => ({
  scrapeArticlesList: jest.fn(),
  scrapeUrl: jest.fn(),
  checkScraperHealth: jest.fn(),
}));

jest.mock('@/lib/aiService', () => ({
  generatePolishIntro: jest.fn(),
}));

jest.mock('@/lib/editionService', () => ({
  addArticleToEdition: jest.fn(),
  getOrCreateEdition: jest.fn(),
}));

jest.mock('@/lib/connectors/factory', () => ({
  getConnector: jest.fn(),
}));

describe('syncSourcesForUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns stats with 0 articles when user has no sources', async () => {
    const { prisma } = require('@/lib/prisma');
    prisma.privateSource.findMany.mockResolvedValue([]);
    prisma.userSubscription.findMany.mockResolvedValue([]);

    const result = await syncSourcesForUser('user-1');

    expect(result).toEqual({
      userId: 'user-1',
      sourcesProcessed: 0,
      articlesNew: 0,
      articlesSkipped: 0,
      errors: [],
      durationMs: expect.any(Number),
    });
  });

  it('isolates errors per source — one source failure does not block others', async () => {
    const { prisma } = require('@/lib/prisma');
    const { scrapeArticlesList } = require('@/lib/scrapeService');

    prisma.privateSource.findMany.mockResolvedValue([]);
    prisma.userSubscription.findMany.mockResolvedValue([
      { catalogSource: { id: 'cs-1', name: 'Source1', url: 'https://s1.com', isActive: true } },
      { catalogSource: { id: 'cs-2', name: 'Source2', url: 'https://s2.com', isActive: true } },
    ]);

    const { checkScraperHealth } = require('@/lib/scrapeService');
    checkScraperHealth.mockResolvedValue(true);

    // First source fails, second succeeds with 0 articles
    scrapeArticlesList
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true, articles: [] });

    const result = await syncSourcesForUser('user-1');

    expect(result.sourcesProcessed).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Source1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/premium/lib/__tests__/scheduledSyncService.test.ts --no-coverage -t "syncSourcesForUser"`
Expected: FAIL — `syncSourcesForUser is not a function`

- [ ] **Step 3: Implement `syncSourcesForUser`**

Add to `src/premium/lib/scheduledSyncService.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import {
  scrapeArticlesList,
  scrapeUrl,
  checkScraperHealth,
} from '@/lib/scrapeService';
import { generatePolishIntro } from '@/lib/aiService';
import { addArticleToEdition } from '@/lib/editionService';
import { getConnector } from '@/lib/connectors/factory';

export interface SyncResult {
  userId: string;
  sourcesProcessed: number;
  articlesNew: number;
  articlesSkipped: number;
  errors: string[];
  durationMs: number;
}

const CONNECTOR_TYPES = new Set(['GMAIL', 'LINKEDIN', 'TWITTER']);

/**
 * Sync all sources for a single user. Isolates errors per source.
 * Reuses existing scraping pipeline from scrape/trigger.
 */
export async function syncSourcesForUser(userId: string): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    userId,
    sourcesProcessed: 0,
    articlesNew: 0,
    articlesSkipped: 0,
    errors: [],
    durationMs: 0,
  };

  // Load user's sources
  const privateSources = await prisma.privateSource.findMany({
    where: { userId, isActive: true },
  });

  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId },
    include: { catalogSource: true },
  });

  const catalogSources = subscriptions
    .map(s => s.catalogSource)
    .filter(s => s.isActive);

  const allSources = [
    ...privateSources.map(s => ({ ...s, sourceType: 'private' as const })),
    ...catalogSources.map(s => ({ ...s, sourceType: 'catalog' as const })),
  ];

  if (allSources.length === 0) {
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // Check scraper health once for all website sources
  const hasWebsiteSources = allSources.some(
    s => s.sourceType === 'catalog' || (s.sourceType === 'private' && !CONNECTOR_TYPES.has((s as { type?: string }).type || ''))
  );
  const scraperHealthy = hasWebsiteSources ? await checkScraperHealth() : true;

  for (const source of allSources) {
    result.sourcesProcessed++;
    try {
      const isConnector = source.sourceType === 'private' && CONNECTOR_TYPES.has((source as { type?: string }).type || '');

      if (isConnector) {
        await syncConnectorSource(source as typeof privateSources[0], userId, result);
      } else if (scraperHealthy) {
        await syncScraperSource(source, userId, result);
      } else {
        result.errors.push(`${source.name}: Scraper unavailable`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`${source.name}: ${msg}`);
      console.error(`[SCHED] Source error (${source.name}):`, msg);
    }
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

async function syncConnectorSource(
  source: { id: string; type: string; status: string; credentials: string | null; config: unknown; name: string },
  userId: string,
  result: SyncResult
): Promise<void> {
  if (source.status === 'DISCONNECTED' || !source.credentials) {
    result.errors.push(`${source.name}: Not connected`);
    return;
  }

  await prisma.privateSource.update({
    where: { id: source.id },
    data: { status: 'SYNCING' },
  });

  try {
    const connector = await getConnector(source.type as 'GMAIL' | 'LINKEDIN' | 'TWITTER');
    const fullSource = await prisma.privateSource.findUnique({ where: { id: source.id } });
    if (!fullSource) return;

    const items = await connector.fetchItems(fullSource);

    for (const item of items) {
      const existing = await prisma.article.findUnique({ where: { url: item.url } });
      if (existing) {
        result.articlesSkipped++;
        continue;
      }

      const article = await prisma.article.create({
        data: {
          url: item.url,
          title: item.title,
          intro: null,
          summary: null,
          imageUrl: null,
          author: item.author || null,
          publishedAt: item.date ? new Date(item.date) : null,
          privateSourceId: source.id,
        },
      });

      await addArticleToEdition(article.id, userId);
      result.articlesNew++;
    }

    await prisma.privateSource.update({
      where: { id: source.id },
      data: { status: 'CONNECTED', lastScrapedAt: new Date(), lastSyncError: null },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    await prisma.privateSource.update({
      where: { id: source.id },
      data: { status: 'ERROR', lastSyncError: msg },
    });
    throw error;
  }
}

async function syncScraperSource(
  source: { id: string; name: string; url: string; sourceType: 'private' | 'catalog'; config?: unknown },
  userId: string,
  result: SyncResult
): Promise<void> {
  const articlesResult = await scrapeArticlesList(source.url, 20, source.config as { includePatterns?: string[]; excludePatterns?: string[] } | undefined);

  if (!articlesResult.success) {
    result.errors.push(`${source.name}: ${articlesResult.error}`);
    return;
  }

  for (const articleInfo of articlesResult.articles) {
    try {
      const existing = await prisma.article.findUnique({ where: { url: articleInfo.url } });
      if (existing) {
        result.articlesSkipped++;
        continue;
      }

      const articleContent = await scrapeUrl(articleInfo.url);
      if (!articleContent.success) {
        result.errors.push(`${source.name}/${articleInfo.title}: ${articleContent.error}`);
        continue;
      }

      const intro = await generatePolishIntro(
        articleContent.title || articleInfo.title,
        articleContent.markdown || ''
      );

      const articleData: Record<string, unknown> = {
        url: articleInfo.url,
        title: articleContent.title || articleInfo.title,
        intro: intro || null,
        summary: null,
        imageUrl: null,
        author: articleInfo.author || null,
        publishedAt: articleInfo.date ? new Date(articleInfo.date) : null,
      };

      if (source.sourceType === 'private') {
        articleData.privateSourceId = source.id;
      } else {
        articleData.catalogSourceId = source.id;
      }

      const article = await prisma.article.create({ data: articleData });
      await addArticleToEdition(article.id, userId);
      result.articlesNew++;
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
        result.articlesSkipped++;
        continue;
      }
      result.errors.push(`${source.name}/${articleInfo.title}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // Update lastScrapedAt
  if (source.sourceType === 'private') {
    await prisma.privateSource.update({
      where: { id: source.id },
      data: { lastScrapedAt: new Date() },
    });
  } else {
    await prisma.catalogSource.update({
      where: { id: source.id },
      data: { lastScrapedAt: new Date() },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/premium/lib/__tests__/scheduledSyncService.test.ts --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/premium/lib/scheduledSyncService.ts src/premium/lib/__tests__/scheduledSyncService.test.ts
git commit -m "feat(premium): add syncSourcesForUser with error isolation (SCHED.1)"
```

---

### Task 4: ScheduledSyncService — `runScheduledSync` orchestrator (TDD)

**Files:**
- Modify: `src/premium/lib/scheduledSyncService.ts`
- Modify: `src/premium/lib/__tests__/scheduledSyncService.test.ts`

- [ ] **Step 1: Write test — `runScheduledSync` orchestrates the full run**

Append to test file:

```typescript
import { runScheduledSync } from '../scheduledSyncService';

describe('runScheduledSync', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips users who are not due for sync', async () => {
    const { prisma } = require('@/lib/prisma');

    // Mock prisma.user.findMany to return a user not due for sync
    prisma.user = {
      findMany: jest.fn().mockResolvedValue([{
        id: 'user-1',
        syncEnabled: false, // disabled
        syncHour: 6,
        syncDays: '1,2,3,4,5',
        syncTimezone: 'UTC',
        lastScheduledSync: null,
      }]),
      update: jest.fn(),
    };

    const result = await runScheduledSync();

    expect(result.usersProcessed).toBe(0);
    expect(result.usersSkipped).toBe(1);
  });

  it('updates lastScheduledSync after successful sync', async () => {
    const { prisma } = require('@/lib/prisma');

    prisma.user = {
      findMany: jest.fn().mockResolvedValue([{
        id: 'user-1',
        syncEnabled: true,
        syncHour: 6,
        syncDays: '1,2,3,4,5',
        syncTimezone: 'UTC',
        lastScheduledSync: null,
      }]),
      update: jest.fn(),
    };
    prisma.privateSource.findMany.mockResolvedValue([]);
    prisma.userSubscription.findMany.mockResolvedValue([]);

    // Mock current time to match syncHour=6, Monday
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-09T06:00:00Z'));

    const result = await runScheduledSync();

    expect(result.usersProcessed).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { lastScheduledSync: expect.any(Date) },
    });

    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/premium/lib/__tests__/scheduledSyncService.test.ts --no-coverage -t "runScheduledSync"`
Expected: FAIL — `runScheduledSync is not a function`

- [ ] **Step 3: Implement `runScheduledSync`**

Add to `src/premium/lib/scheduledSyncService.ts`:

```typescript
export interface ScheduledSyncRunResult {
  usersProcessed: number;
  usersSkipped: number;
  totalArticlesNew: number;
  totalErrors: number;
  userResults: SyncResult[];
  durationMs: number;
}

/**
 * Main orchestrator for scheduled sync.
 * Finds all premium users with sync enabled, checks who is due,
 * and processes them sequentially.
 */
export async function runScheduledSync(): Promise<ScheduledSyncRunResult> {
  const startTime = Date.now();
  const now = new Date();

  const result: ScheduledSyncRunResult = {
    usersProcessed: 0,
    usersSkipped: 0,
    totalArticlesNew: 0,
    totalErrors: 0,
    userResults: [],
    durationMs: 0,
  };

  // Find all users with sync enabled
  const users = await prisma.user.findMany({
    where: { syncEnabled: true },
    select: {
      id: true,
      syncEnabled: true,
      syncHour: true,
      syncDays: true,
      syncTimezone: true,
      lastScheduledSync: true,
    },
  });

  console.log(`[SCHED] Found ${users.length} users with sync enabled`);

  for (const user of users) {
    if (!isUserDueForSync(user, now)) {
      result.usersSkipped++;
      continue;
    }

    console.log(`[SCHED] Starting sync for user ${user.id} (${result.usersProcessed + 1}/${users.length - result.usersSkipped})`);

    try {
      const userResult = await syncSourcesForUser(user.id);
      result.userResults.push(userResult);
      result.usersProcessed++;
      result.totalArticlesNew += userResult.articlesNew;
      result.totalErrors += userResult.errors.length;

      // Update lastScheduledSync
      await prisma.user.update({
        where: { id: user.id },
        data: { lastScheduledSync: now },
      });

      console.log(
        `[SCHED] User ${user.id}: ${userResult.articlesNew} new, ` +
        `${userResult.articlesSkipped} skipped, ${userResult.errors.length} errors, ` +
        `${userResult.durationMs}ms`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SCHED] User ${user.id} FAILED:`, msg);
      result.totalErrors++;
      // Continue to next user — isolation per user
    }
  }

  result.durationMs = Date.now() - startTime;

  console.log(
    `[SCHED] Run complete: ${result.usersProcessed} processed, ` +
    `${result.usersSkipped} skipped, ${result.totalArticlesNew} new articles, ` +
    `${result.totalErrors} errors, ${result.durationMs}ms total`
  );

  return result;
}
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `npx jest src/premium/lib/__tests__/scheduledSyncService.test.ts --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/premium/lib/scheduledSyncService.ts src/premium/lib/__tests__/scheduledSyncService.test.ts
git commit -m "feat(premium): add runScheduledSync orchestrator with per-user isolation (SCHED.1)"
```

---

## Chunk 2: Cron Endpoint + Verification

### Task 5: Cron API Route — `GET /api/cron/scrape-scheduled`

**Files:**
- Create: `src/app/api/cron/scrape-scheduled/route.ts`
- Create: `src/app/api/cron/scrape-scheduled/__tests__/route.test.ts`

**Reference:** Follow exact pattern from `src/app/api/cron/editions/route.ts`

- [ ] **Step 1: Write test — endpoint returns 401 without CRON_SECRET**

Create `src/app/api/cron/scrape-scheduled/__tests__/route.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Mock premium module
jest.mock('@/premium/lib/scheduledSyncService', () => ({
  runScheduledSync: jest.fn().mockResolvedValue({
    usersProcessed: 0,
    usersSkipped: 0,
    totalArticlesNew: 0,
    totalErrors: 0,
    userResults: [],
    durationMs: 100,
  }),
}));

jest.mock('@/lib/featureFlags', () => ({
  isPremiumEnabled: jest.fn().mockReturnValue(true),
}));

describe('GET /api/cron/scrape-scheduled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('returns 401 when CRON_SECRET is set and auth header is missing', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/cron/scrape-scheduled');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 404 when premium is not enabled', async () => {
    const { isPremiumEnabled } = require('@/lib/featureFlags');
    isPremiumEnabled.mockReturnValue(false);

    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/cron/scrape-scheduled', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 with sync results when authorized and premium enabled', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/cron/scrape-scheduled', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('usersProcessed');
    expect(body).toHaveProperty('timestamp');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/api/cron/scrape-scheduled/__tests__/route.test.ts --no-coverage`
Expected: FAIL — Cannot find module

- [ ] **Step 3: Implement the cron route**

Create `src/app/api/cron/scrape-scheduled/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isPremiumEnabled } from '@/lib/featureFlags';

/**
 * CRON endpoint for scheduled article sync (Premium only).
 * Called every minute by system crontab. Checks which premium users
 * need sync and processes them sequentially.
 *
 * Auth: Bearer ${CRON_SECRET}
 * Premium gate: PREMIUM_ENABLED env var
 *
 * External cron: * * * * * curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scrape-scheduled
 */
export async function GET(request: NextRequest) {
  try {
    // Premium gate
    if (!isPremiumEnabled()) {
      return NextResponse.json({ error: 'Premium feature not enabled' }, { status: 404 });
    }

    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Dynamic import to avoid ESLint no-restricted-imports for premium code
    const { runScheduledSync } = await import('@/premium/lib/scheduledSyncService');
    const result = await runScheduledSync();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SCHED] CRITICAL ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduled sync' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/api/cron/scrape-scheduled/__tests__/route.test.ts --no-coverage`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/scrape-scheduled/
git commit -m "feat(premium): add /api/cron/scrape-scheduled endpoint (SCHED.1, SCHED.6)"
```

---

### Task 6: TypeScript + Lint Verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run ESLint**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 3: Run all tests**

Run: `npx jest --no-coverage`
Expected: All tests pass (existing + new)

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(premium): resolve lint/tsc issues in scheduled sync"
```

---

### Task 7: Documentation Update

**Files:**
- Modify: `docs/backlog.md` (SCHED.1-3 status update)

- [ ] **Step 1: Update backlog status for completed tasks**

In `docs/backlog.md`, update SCHED tasks:
- SCHED.1: 📋 TODO → ✅ DONE
- SCHED.2: 📋 TODO → ✅ DONE
- SCHED.3: 📋 TODO → ✅ DONE
- SCHED.4: 📋 TODO → ✅ DONE
- SCHED.6: 📋 TODO → ✅ DONE
- SCHED.5 (UI): remains 📋 TODO (Phase 2)

- [ ] **Step 2: Commit**

```bash
git add docs/backlog.md
git commit -m "docs: update backlog — SCHED.1-4,6 done, SCHED.5 Phase 2 (UI)"
```
