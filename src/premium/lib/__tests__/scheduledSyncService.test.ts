// Copyright (c) Leszek Giza. Commercial license — see src/premium/LICENSE-PREMIUM

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUserDueForSync } from '../scheduledSyncService';

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
});
