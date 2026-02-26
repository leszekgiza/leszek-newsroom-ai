import { prisma } from "@/lib/prisma";

/**
 * Clean up expired trash: remove private articles older than 15 days from DB.
 * Catalog articles keep their DismissedArticle record (permanently hidden)
 * but the Article record stays for other users.
 */
export async function cleanupExpiredTrash(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);

  // Find dismissed private articles older than 15 days
  const expiredPrivate = await prisma.dismissedArticle.findMany({
    where: {
      dismissedAt: { lt: cutoff },
      article: { privateSourceId: { not: null } },
    },
    select: { articleId: true },
  });

  if (expiredPrivate.length === 0) return 0;

  const articleIds = expiredPrivate.map((d) => d.articleId);

  // Delete private articles (cascade will clean up junction records)
  const { count } = await prisma.article.deleteMany({
    where: { id: { in: articleIds } },
  });

  return count;
}
