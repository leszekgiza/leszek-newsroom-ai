-- AlterTable: Add briefing fields to users
ALTER TABLE "users" ADD COLUMN "briefing_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "briefing_time" TEXT DEFAULT '07:00';

-- CreateTable: briefings
CREATE TABLE "briefings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "edition_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "intro_script" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "article_ids" TEXT[],
    "top3_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: push_subscriptions
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "briefings_user_id_idx" ON "briefings"("user_id");
CREATE INDEX "briefings_date_idx" ON "briefings"("date" DESC);
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
