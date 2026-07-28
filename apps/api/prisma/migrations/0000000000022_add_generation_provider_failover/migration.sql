ALTER TABLE "generate_jobs"
  ADD COLUMN "providerCandidates" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "providerAttemptIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "providerAttempts" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "generate_jobs"
SET "providerCandidates" = jsonb_build_array("provider")
WHERE "provider" <> '' AND "providerCandidates" = '[]'::jsonb;
