// Copyright (c) Leszek Giza. Commercial license — see src/premium/LICENSE-PREMIUM

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUserDueForSync, type SyncUser } from '../scheduledSyncService';

// Mock all external dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    privateSource: {
      findMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    userSubscription: {
      findMany: vi.fn(),
    },
    catalogSource: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    article: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/scrapeService', () => ({
  scrapeArticlesList: vi.fn(),
  scrapeUrl: vi.fn(),
  checkScraperHealth: vi.fn(),
}));

vi.mock('@/lib/aiService', () => ({
  generatePolishIntro: vi.fn(),
}));

vi.mock('@/lib/editionService', () => ({
  addArticleToEdition: vi.fn(),
}));

vi.mock('@/lib/connectors/factory', () => ({
  getConnector: vi.fn(),
}));

describe('isUserDueForSync', () => {
  const baseUser = {
    id: 'user-1',
    syncEnabled: true,
    syncHour: 6,
    syncDays: '1,2,3,4,5',
    syncTimezone: 'Europe/Warsaw',
    lastScheduledSync: null as Date | null,
  };

  it('returns true when sync is enabled, correct hour/day, and no sync today', () => {
    // Monday 2026-03-09, 6:00 Warsaw = 5:00 UTC (CET=UTC+1)
    const now = new Date('2026-03-09T05:00:00Z');
    expect(isUserDueForSync(baseUser, now)).toBe(true);
  });

  it('returns false when sync is disabled', () => {
    const user = { ...baseUser, syncEnabled: false };
    const now = new Date('2026-03-09T05:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(false);
  });

  it('returns false when today is not in syncDays (Sunday)', () => {
    const now = new Date('2026-03-08T05:00:00Z'); // Sunday
    expect(isUserDueForSync(baseUser, now)).toBe(false);
  });

  it('returns false when current hour does not match syncHour', () => {
    const now = new Date('2026-03-09T10:00:00Z'); // 11:00 Warsaw
    expect(isUserDueForSync(baseUser, now)).toBe(false);
  });

  it('returns false when user already synced today', () => {
    const user = {
      ...baseUser,
      lastScheduledSync: new Date('2026-03-09T05:05:00Z'),
    };
    const now = new Date('2026-03-09T05:30:00Z');
    expect(isUserDueForSync(user, now)).toBe(false);
  });

  it('returns true when last sync was yesterday', () => {
    const user = {
      ...baseUser,
      lastScheduledSync: new Date('2026-03-08T05:00:00Z'),
    };
    const now = new Date('2026-03-09T05:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(true);
  });

  it('handles UTC timezone correctly', () => {
    const user = { ...baseUser, syncTimezone: 'UTC', syncHour: 6 };
    const now = new Date('2026-03-09T06:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(true);
  });

  it('handles weekend days (6=Sat, 7=Sun)', () => {
    const user = { ...baseUser, syncDays: '6,7' }; // Sat-Sun only
    const now = new Date('2026-03-08T05:00:00Z'); // Sunday
    expect(isUserDueForSync(user, now)).toBe(true);
  });

  it('handles all days of week', () => {
    const user = { ...baseUser, syncDays: '1,2,3,4,5,6,7' };
    const now = new Date('2026-03-08T05:00:00Z'); // Sunday
    expect(isUserDueForSync(user, now)).toBe(true);
  });

  it('handles DST transition correctly (summer time)', () => {
    // In summer, Europe/Warsaw is CEST = UTC+2
    // syncHour=6 in Warsaw summer => 4:00 UTC
    const user = { ...baseUser, syncHour: 6, syncDays: '1,2,3,4,5,6,7' };
    // 2026-07-06 is a Monday, in CEST (summer)
    const now = new Date('2026-07-06T04:00:00Z'); // 06:00 Warsaw CEST
    expect(isUserDueForSync(user, now)).toBe(true);
  });

  it('handles syncHour=0 (midnight sync)', () => {
    const user = { ...baseUser, syncTimezone: 'UTC', syncHour: 0, syncDays: '1,2,3,4,5,6,7' };
    // Monday midnight UTC
    const now = new Date('2026-03-09T00:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(true);
  });

  it('returns false when syncDays is empty string', () => {
    const user = { ...baseUser, syncDays: '' };
    const now = new Date('2026-03-09T05:00:00Z');
    expect(isUserDueForSync(user, now)).toBe(false);
  });
});

describe('syncSourcesForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns stats with 0 articles when user has no sources', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');

    // No private sources, no subscriptions
    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);

    const result = await syncSourcesForUser('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.sourcesProcessed).toBe(0);
    expect(result.articlesNew).toBe(0);
    expect(result.articlesSkipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('isolates errors per source — one failure does not block others', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList } = await import('@/lib/scrapeService');

    // Two private website sources — first will fail, second should still run
    const sources = [
      { id: 'src-1', userId: 'user-1', name: 'Failing Source', url: 'https://fail.example.com', type: 'WEBSITE', config: null, credentials: null, status: 'DISCONNECTED', syncInterval: 60, lastSyncError: null, isActive: true, lastScrapedAt: null, createdAt: new Date() },
      { id: 'src-2', userId: 'user-1', name: 'OK Source', url: 'https://ok.example.com', type: 'WEBSITE', config: null, credentials: null, status: 'DISCONNECTED', syncInterval: 60, lastSyncError: null, isActive: true, lastScrapedAt: null, createdAt: new Date() },
    ];

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue(sources as never);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);
    vi.mocked(checkScraperHealth).mockResolvedValue(true);

    // First source: scrapeArticlesList throws
    vi.mocked(scrapeArticlesList)
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ success: true, source_url: 'https://ok.example.com', articles: [] });

    const result = await syncSourcesForUser('user-1');

    expect(result.sourcesProcessed).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Failing Source');
  });

  it('syncs both private website sources and catalog subscriptions in one run', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList, scrapeUrl } = await import('@/lib/scrapeService');
    const { generatePolishIntro } = await import('@/lib/aiService');
    const { addArticleToEdition } = await import('@/lib/editionService');

    // 1 private WEBSITE source
    const privateSources = [
      { id: 'ps-1', userId: 'user-1', name: 'Private Blog', url: 'https://private.blog.com', type: 'WEBSITE', config: null, credentials: null, status: 'CONNECTED', syncInterval: 60, lastSyncError: null, isActive: true, lastScrapedAt: null, createdAt: new Date() },
    ];

    // 1 catalog subscription
    const subscriptions = [
      { id: 'sub-1', userId: 'user-1', catalogSourceId: 'cs-1', catalogSource: { id: 'cs-1', name: 'Catalog Blog', url: 'https://catalog.blog.com', isActive: true, lastScrapedAt: null, articleCount: 0, createdAt: new Date() } },
    ];

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue(privateSources as never);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue(subscriptions as never);
    vi.mocked(checkScraperHealth).mockResolvedValue(true);

    // Each source returns 1 article
    vi.mocked(scrapeArticlesList)
      .mockResolvedValueOnce({ success: true, source_url: 'https://private.blog.com', articles: [{ url: 'https://private.blog.com/post1', title: 'Private Post 1' }] })
      .mockResolvedValueOnce({ success: true, source_url: 'https://catalog.blog.com', articles: [{ url: 'https://catalog.blog.com/post1', title: 'Catalog Post 1' }] });

    vi.mocked(scrapeUrl).mockResolvedValue({ success: true, url: 'https://example.com', title: 'Post', markdown: 'Content here', html_length: 100, links_count: 5 } as never);
    vi.mocked(generatePolishIntro).mockResolvedValue('Generated intro');
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.article.create)
      .mockResolvedValueOnce({ id: 'art-1' } as never)
      .mockResolvedValueOnce({ id: 'art-2' } as never);
    vi.mocked(addArticleToEdition).mockResolvedValue(undefined as never);
    vi.mocked(prisma.privateSource.update).mockResolvedValue({} as never);
    vi.mocked(prisma.catalogSource.update).mockResolvedValue({} as never);

    const result = await syncSourcesForUser('user-1');

    expect(result.sourcesProcessed).toBe(2);
    expect(result.articlesNew).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it('continues processing after scraper health check fails for website sources', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList } = await import('@/lib/scrapeService');

    const sources = [
      { id: 'src-1', userId: 'user-1', name: 'Source A', url: 'https://a.com', type: 'WEBSITE', config: null, credentials: null, status: 'CONNECTED', syncInterval: 60, lastSyncError: null, isActive: true, lastScrapedAt: null, createdAt: new Date() },
      { id: 'src-2', userId: 'user-1', name: 'Source B', url: 'https://b.com', type: 'WEBSITE', config: null, credentials: null, status: 'CONNECTED', syncInterval: 60, lastSyncError: null, isActive: true, lastScrapedAt: null, createdAt: new Date() },
    ];

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue(sources as never);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);

    // Scraper unhealthy on first call, healthy on second
    vi.mocked(checkScraperHealth)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    vi.mocked(scrapeArticlesList).mockResolvedValueOnce({
      success: true, source_url: 'https://b.com', articles: [],
    });
    vi.mocked(prisma.privateSource.update).mockResolvedValue({} as never);

    const result = await syncSourcesForUser('user-1');

    expect(result.sourcesProcessed).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Source A');
    expect(result.errors[0]).toContain('Scraper service unavailable');
  });

  it('calls addArticleToEdition for each new article created', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList, scrapeUrl } = await import('@/lib/scrapeService');
    const { generatePolishIntro } = await import('@/lib/aiService');
    const { addArticleToEdition } = await import('@/lib/editionService');

    // 1 catalog source with 2 articles
    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', catalogSourceId: 'cs-1', catalogSource: { id: 'cs-1', name: 'Blog', url: 'https://blog.com', isActive: true, lastScrapedAt: null, articleCount: 0, createdAt: new Date() } },
    ] as never);

    vi.mocked(checkScraperHealth).mockResolvedValue(true);
    vi.mocked(scrapeArticlesList).mockResolvedValueOnce({
      success: true,
      source_url: 'https://blog.com',
      articles: [
        { url: 'https://blog.com/a', title: 'Article A' },
        { url: 'https://blog.com/b', title: 'Article B' },
      ],
    });
    vi.mocked(scrapeUrl).mockResolvedValue({ success: true, url: 'https://blog.com/a', title: 'Article', markdown: 'Content', html_length: 100, links_count: 5 } as never);
    vi.mocked(generatePolishIntro).mockResolvedValue('Intro');
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.article.create)
      .mockResolvedValueOnce({ id: 'art-10' } as never)
      .mockResolvedValueOnce({ id: 'art-11' } as never);
    vi.mocked(addArticleToEdition).mockResolvedValue(undefined as never);
    vi.mocked(prisma.catalogSource.update).mockResolvedValue({} as never);

    const result = await syncSourcesForUser('user-1');

    expect(addArticleToEdition).toHaveBeenCalledTimes(2);
    expect(addArticleToEdition).toHaveBeenCalledWith('art-10', 'user-1');
    expect(addArticleToEdition).toHaveBeenCalledWith('art-11', 'user-1');
    expect(result.articlesNew).toBe(2);
  });

  it('skips articles that already exist in database (deduplication)', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList, scrapeUrl } = await import('@/lib/scrapeService');
    const { generatePolishIntro } = await import('@/lib/aiService');
    const { addArticleToEdition } = await import('@/lib/editionService');

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', catalogSourceId: 'cs-1', catalogSource: { id: 'cs-1', name: 'Blog', url: 'https://blog.com', isActive: true, lastScrapedAt: null, articleCount: 0, createdAt: new Date() } },
    ] as never);

    vi.mocked(checkScraperHealth).mockResolvedValue(true);
    vi.mocked(scrapeArticlesList).mockResolvedValueOnce({
      success: true,
      source_url: 'https://blog.com',
      articles: [
        { url: 'https://blog.com/existing', title: 'Existing' },
        { url: 'https://blog.com/new1', title: 'New 1' },
        { url: 'https://blog.com/new2', title: 'New 2' },
      ],
    });
    vi.mocked(scrapeUrl).mockResolvedValue({ success: true, url: 'https://blog.com/x', title: 'X', markdown: 'Content', html_length: 100, links_count: 5 } as never);
    vi.mocked(generatePolishIntro).mockResolvedValue('Intro');

    // First article already exists, second and third are new
    vi.mocked(prisma.article.findUnique)
      .mockResolvedValueOnce({ id: 'existing-art' } as never)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    vi.mocked(prisma.article.create)
      .mockResolvedValueOnce({ id: 'art-new1' } as never)
      .mockResolvedValueOnce({ id: 'art-new2' } as never);
    vi.mocked(addArticleToEdition).mockResolvedValue(undefined as never);
    vi.mocked(prisma.catalogSource.update).mockResolvedValue({} as never);

    const result = await syncSourcesForUser('user-1');

    expect(result.articlesSkipped).toBe(1);
    expect(result.articlesNew).toBe(2);
  });

  it('syncs connector sources (GMAIL type) using connector pipeline', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { getConnector } = await import('@/lib/connectors/factory');
    const { addArticleToEdition } = await import('@/lib/editionService');

    const gmailSource = {
      id: 'src-gmail',
      userId: 'user-1',
      name: 'Gmail',
      url: 'gmail://inbox',
      type: 'GMAIL',
      config: null,
      credentials: 'encrypted-creds',
      status: 'CONNECTED',
      syncInterval: 60,
      lastSyncError: null,
      isActive: true,
      lastScrapedAt: null,
      createdAt: new Date(),
    };

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([gmailSource] as never);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);

    const mockConnector = {
      fetchItems: vi.fn().mockResolvedValue([
        { url: 'https://mail.google.com/msg/1', title: 'Newsletter Issue #1', content: 'Newsletter content', author: 'sender@example.com', publishedAt: new Date(), externalId: 'msg-1' },
      ]),
    };
    vi.mocked(getConnector).mockResolvedValue(mockConnector as never);

    // Return full source for findUnique
    vi.mocked(prisma.privateSource.findUnique).mockResolvedValue(gmailSource as never);
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.article.create).mockResolvedValueOnce({ id: 'art-gmail-1' } as never);
    vi.mocked(addArticleToEdition).mockResolvedValue(undefined as never);
    vi.mocked(prisma.privateSource.update).mockResolvedValue({} as never);

    const result = await syncSourcesForUser('user-1');

    expect(result.articlesNew).toBe(1);
    expect(result.errors).toEqual([]);
    expect(getConnector).toHaveBeenCalledWith('GMAIL');
    expect(mockConnector.fetchItems).toHaveBeenCalledWith(gmailSource);
    expect(addArticleToEdition).toHaveBeenCalledWith('art-gmail-1', 'user-1');
  });

  it('reports error for disconnected connector sources without blocking', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList } = await import('@/lib/scrapeService');

    const sources = [
      { id: 'src-gmail', userId: 'user-1', name: 'Gmail Disconnected', url: 'gmail://inbox', type: 'GMAIL', config: null, credentials: null, status: 'DISCONNECTED', syncInterval: 60, lastSyncError: null, isActive: true, lastScrapedAt: null, createdAt: new Date() },
      { id: 'src-web', userId: 'user-1', name: 'Website OK', url: 'https://ok.com', type: 'WEBSITE', config: null, credentials: null, status: 'CONNECTED', syncInterval: 60, lastSyncError: null, isActive: true, lastScrapedAt: null, createdAt: new Date() },
    ];

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue(sources as never);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.privateSource.update).mockResolvedValue({} as never);
    vi.mocked(checkScraperHealth).mockResolvedValue(true);
    vi.mocked(scrapeArticlesList).mockResolvedValueOnce({
      success: true, source_url: 'https://ok.com', articles: [],
    });

    const result = await syncSourcesForUser('user-1');

    expect(result.sourcesProcessed).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Gmail Disconnected');
    expect(result.errors[0]).toContain('Connector not connected');
  });

  it('creates article even when AI intro generation fails', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { getConnector } = await import('@/lib/connectors/factory');
    const { generatePolishIntro } = await import('@/lib/aiService');
    const { addArticleToEdition } = await import('@/lib/editionService');

    const gmailSource = {
      id: 'src-gmail',
      userId: 'user-1',
      name: 'Gmail',
      url: 'gmail://inbox',
      type: 'GMAIL',
      config: null,
      credentials: 'encrypted-creds',
      status: 'CONNECTED',
      syncInterval: 60,
      lastSyncError: null,
      isActive: true,
      lastScrapedAt: null,
      createdAt: new Date(),
    };

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([gmailSource] as never);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);

    const mockConnector = {
      fetchItems: vi.fn().mockResolvedValue([
        { url: 'https://mail.google.com/msg/2', title: 'Newsletter', content: 'Some content', author: 'test@test.com', publishedAt: new Date(), externalId: 'msg-2' },
      ]),
    };
    vi.mocked(getConnector).mockResolvedValue(mockConnector as never);
    vi.mocked(prisma.privateSource.findUnique).mockResolvedValue(gmailSource as never);
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);

    // AI intro generation throws
    vi.mocked(generatePolishIntro).mockRejectedValue(new Error('OpenAI rate limit'));

    vi.mocked(prisma.article.create).mockResolvedValueOnce({ id: 'art-no-intro' } as never);
    vi.mocked(addArticleToEdition).mockResolvedValue(undefined as never);
    vi.mocked(prisma.privateSource.update).mockResolvedValue({} as never);

    const result = await syncSourcesForUser('user-1');

    expect(result.articlesNew).toBe(1);
    expect(result.errors).toEqual([]);
    // Article created with intro=null since AI failed
    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intro: null }),
      }),
    );
  });

  it('handles Prisma P2002 duplicate key error gracefully', async () => {
    const { syncSourcesForUser } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList, scrapeUrl } = await import('@/lib/scrapeService');
    const { generatePolishIntro } = await import('@/lib/aiService');

    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([
      { id: 'sub-1', userId: 'user-1', catalogSourceId: 'cs-1', catalogSource: { id: 'cs-1', name: 'Blog', url: 'https://blog.com', isActive: true, lastScrapedAt: null, articleCount: 0, createdAt: new Date() } },
    ] as never);

    vi.mocked(checkScraperHealth).mockResolvedValue(true);
    vi.mocked(scrapeArticlesList).mockResolvedValueOnce({
      success: true,
      source_url: 'https://blog.com',
      articles: [{ url: 'https://blog.com/race-condition', title: 'Race Condition Post' }],
    });
    vi.mocked(scrapeUrl).mockResolvedValue({ success: true, url: 'https://blog.com/race-condition', title: 'Race Condition Post', markdown: 'Content', html_length: 100, links_count: 5 } as never);
    vi.mocked(generatePolishIntro).mockResolvedValue('Intro');

    // Passes dedup check (not in DB yet)
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);

    // But article.create throws P2002 (race condition: another process inserted it)
    const { Prisma } = await import('@prisma/client');
    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`url`)', {
      code: 'P2002',
      clientVersion: '7.2.0',
    });
    vi.mocked(prisma.article.create).mockRejectedValueOnce(p2002Error);
    vi.mocked(prisma.catalogSource.update).mockResolvedValue({} as never);

    const result = await syncSourcesForUser('user-1');

    expect(result.articlesSkipped).toBe(1);
    expect(result.articlesNew).toBe(0);
    // P2002 should NOT be added to errors (graceful handling)
    expect(result.errors).toEqual([]);
  });
});

describe('runScheduledSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // Helper: create a user that IS due for sync at a given time
  function makeDueUser(id: string, overrides?: Partial<SyncUser>): SyncUser {
    return {
      id,
      syncEnabled: true,
      syncHour: 6,
      syncDays: '1,2,3,4,5',
      syncTimezone: 'UTC',
      lastScheduledSync: null,
      ...overrides,
    };
  }

  it('skips users who are not due for sync', async () => {
    const { runScheduledSync } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');

    // User with syncHour=6 but we set time to 10:00 UTC -> not due
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T10:00:00Z')); // Monday 10:00 UTC

    const user = makeDueUser('user-skip', { syncHour: 6 });
    vi.mocked(prisma.user.findMany).mockResolvedValue([user] as never);

    const result = await runScheduledSync();

    expect(result.usersSkipped).toBe(1);
    expect(result.usersProcessed).toBe(0);
    expect(result.totalArticlesNew).toBe(0);
    expect(prisma.user.update).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('processes due users and updates lastScheduledSync', async () => {
    const { runScheduledSync } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');

    // Monday 06:00 UTC — matches syncHour=6, day=1 (Monday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T06:00:00Z'));

    const user = makeDueUser('user-due');
    vi.mocked(prisma.user.findMany).mockResolvedValue([user] as never);

    // syncSourcesForUser internals: no sources
    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await runScheduledSync();

    expect(result.usersProcessed).toBe(1);
    expect(result.usersSkipped).toBe(0);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-due' },
      data: { lastScheduledSync: expect.any(Date) },
    });

    vi.useRealTimers();
  });

  it('isolates errors per user — one failure does not block others', async () => {
    const { runScheduledSync } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T06:00:00Z'));

    const user1 = makeDueUser('user-fail');
    const user2 = makeDueUser('user-ok');
    vi.mocked(prisma.user.findMany).mockResolvedValue([user1, user2] as never);

    // First user's syncSourcesForUser will throw (privateSource.findMany throws on first call)
    vi.mocked(prisma.privateSource.findMany)
      .mockRejectedValueOnce(new Error('DB connection lost'))
      .mockResolvedValueOnce([]);
    vi.mocked(prisma.userSubscription.findMany)
      .mockResolvedValue([]);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await runScheduledSync();

    // user-fail errored, user-ok processed
    expect(result.totalErrors).toBeGreaterThanOrEqual(1);
    expect(result.usersProcessed).toBe(1);
    // lastScheduledSync updated only for user-ok
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-ok' },
      data: { lastScheduledSync: expect.any(Date) },
    });

    vi.useRealTimers();
  });

  it('returns aggregate stats including durationMs', async () => {
    const { runScheduledSync } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T06:00:00Z'));

    // No users with sync enabled
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await runScheduledSync();

    expect(result.usersProcessed).toBe(0);
    expect(result.usersSkipped).toBe(0);
    expect(result.totalArticlesNew).toBe(0);
    expect(result.totalErrors).toBe(0);
    expect(result.userResults).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    vi.useRealTimers();
  });

  it('logs structured output for each sync phase', async () => {
    const { runScheduledSync } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T06:00:00Z'));

    const consoleSpy = vi.spyOn(console, 'log');

    const user = makeDueUser('user-log');
    vi.mocked(prisma.user.findMany).mockResolvedValue([user] as never);
    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await runScheduledSync();

    const logMessages = consoleSpy.mock.calls.map(c => String(c[0]));
    expect(logMessages.some(m => m.includes('[SCHED] Found'))).toBe(true);
    expect(logMessages.some(m => m.includes('[SCHED] Starting sync'))).toBe(true);
    expect(logMessages.some(m => m.includes('[SCHED] User'))).toBe(true);
    expect(logMessages.some(m => m.includes('[SCHED] Run complete'))).toBe(true);

    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  it('aggregates stats across multiple users correctly', async () => {
    const { runScheduledSync } = await import('../scheduledSyncService');
    const { prisma } = await import('@/lib/prisma');
    const { checkScraperHealth, scrapeArticlesList, scrapeUrl } = await import('@/lib/scrapeService');
    const { generatePolishIntro } = await import('@/lib/aiService');
    const { addArticleToEdition } = await import('@/lib/editionService');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T06:00:00Z'));

    const user1 = makeDueUser('user-agg-1');
    const user2 = makeDueUser('user-agg-2');
    vi.mocked(prisma.user.findMany).mockResolvedValue([user1, user2] as never);

    // User 1: 1 catalog source with 1 article
    // User 2: 1 catalog source with 2 articles
    vi.mocked(prisma.privateSource.findMany).mockResolvedValue([]);

    // User 1 subscriptions, then user 2 subscriptions
    vi.mocked(prisma.userSubscription.findMany)
      .mockResolvedValueOnce([
        { id: 'sub-u1', userId: 'user-agg-1', catalogSourceId: 'cs-u1', catalogSource: { id: 'cs-u1', name: 'Blog U1', url: 'https://u1.com', isActive: true, lastScrapedAt: null, articleCount: 0, createdAt: new Date() } },
      ] as never)
      .mockResolvedValueOnce([
        { id: 'sub-u2', userId: 'user-agg-2', catalogSourceId: 'cs-u2', catalogSource: { id: 'cs-u2', name: 'Blog U2', url: 'https://u2.com', isActive: true, lastScrapedAt: null, articleCount: 0, createdAt: new Date() } },
      ] as never);

    vi.mocked(checkScraperHealth).mockResolvedValue(true);

    // User 1: 1 article, User 2: 2 articles
    vi.mocked(scrapeArticlesList)
      .mockResolvedValueOnce({ success: true, source_url: 'https://u1.com', articles: [{ url: 'https://u1.com/a', title: 'U1A' }] })
      .mockResolvedValueOnce({ success: true, source_url: 'https://u2.com', articles: [{ url: 'https://u2.com/a', title: 'U2A' }, { url: 'https://u2.com/b', title: 'U2B' }] });

    vi.mocked(scrapeUrl).mockResolvedValue({ success: true, url: 'https://example.com', title: 'Title', markdown: 'Content', html_length: 100, links_count: 5 } as never);
    vi.mocked(generatePolishIntro).mockResolvedValue('Intro');
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.article.create)
      .mockResolvedValueOnce({ id: 'art-u1-1' } as never)
      .mockResolvedValueOnce({ id: 'art-u2-1' } as never)
      .mockResolvedValueOnce({ id: 'art-u2-2' } as never);
    vi.mocked(addArticleToEdition).mockResolvedValue(undefined as never);
    vi.mocked(prisma.catalogSource.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await runScheduledSync();

    expect(result.usersProcessed).toBe(2);
    expect(result.totalArticlesNew).toBe(3); // 1 + 2
    expect(result.totalErrors).toBe(0);

    vi.useRealTimers();
  });
});
