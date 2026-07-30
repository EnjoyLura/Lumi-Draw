ALTER TABLE "works" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "works_reviewedAt_idx" ON "works"("reviewedAt");
