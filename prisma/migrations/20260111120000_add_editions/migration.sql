-- CreateTable
CREATE TABLE "editions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "article_count" INTEGER NOT NULL DEFAULT 0,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editions_pkey" PRIMARY KEY ("id")
);

-- Add edition_id to articles (nullable for backwards compatibility)
ALTER TABLE "articles" ADD COLUMN "edition_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "editions_user_id_date_key" ON "editions"("user_id", "date");

-- CreateIndex
CREATE INDEX "editions_user_id_idx" ON "editions"("user_id");

-- CreateIndex
CREATE INDEX "editions_date_idx" ON "editions"("date" DESC);

-- CreateIndex
CREATE INDEX "articles_edition_id_idx" ON "articles"("edition_id");

-- AddForeignKey
ALTER TABLE "editions" ADD CONSTRAINT "editions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
