-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('CONNECTED', 'SYNCING', 'ERROR', 'EXPIRED', 'DISCONNECTED');

-- AlterTable
ALTER TABLE "private_sources" ADD COLUMN "status" "ConnectorStatus" NOT NULL DEFAULT 'DISCONNECTED';
ALTER TABLE "private_sources" ADD COLUMN "sync_interval" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "private_sources" ADD COLUMN "last_sync_error" TEXT;
