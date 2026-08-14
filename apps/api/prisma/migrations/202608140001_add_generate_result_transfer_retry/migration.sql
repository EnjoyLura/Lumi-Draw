ALTER TABLE "generate_results"
  ADD COLUMN "sourceUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "transferAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "transferLastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "transferNextAttemptAt" TIMESTAMP(3);

CREATE INDEX "generate_results_transferNextAttemptAt_idx"
  ON "generate_results"("transferNextAttemptAt");
