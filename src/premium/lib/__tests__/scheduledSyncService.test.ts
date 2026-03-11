// Copyright (c) Leszek Giza. Commercial license — see src/premium/LICENSE-PREMIUM

import { describe, it, expect } from 'vitest';
import { isUserDueForSync } from '../scheduledSyncService';

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
