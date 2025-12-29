-- CreateTable
CREATE TABLE "dismissed_articles" (
    "user_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_articles_pkey" PRIMARY KEY ("user_id","article_id")
);

-- AddForeignKey
ALTER TABLE "dismissed_articles" ADD CONSTRAINT "dismissed_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismissed_articles" ADD CONSTRAINT "dismissed_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
