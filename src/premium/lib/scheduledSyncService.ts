// Copyright (c) Leszek Giza. Commercial license — see src/premium/LICENSE-PREMIUM

export interface SyncUser {
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
      return false;
    }
  }

  return true;
}
