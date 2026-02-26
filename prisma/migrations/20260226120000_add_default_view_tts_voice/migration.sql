-- Add missing columns that were previously applied via db push
CREATE TYPE "DefaultView" AS ENUM ('FEED', 'EDITIONS');
ALTER TABLE "users" ADD COLUMN "default_view" "DefaultView" NOT NULL DEFAULT 'FEED';
ALTER TABLE "users" ADD COLUMN "tts_voice" TEXT NOT NULL DEFAULT 'pl-PL-MarekNeural';
