ALTER TABLE "generate_results"
  ADD COLUMN "transferHost" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "transferFallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "transferTtfbMs" INTEGER,
  ADD COLUMN "transferDownloadMs" INTEGER,
  ADD COLUMN "transferUploadMs" INTEGER;
