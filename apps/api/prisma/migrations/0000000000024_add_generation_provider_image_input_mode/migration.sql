ALTER TABLE "generation_providers"
  ADD COLUMN "imageInputMode" TEXT NOT NULL DEFAULT 'multipart',
  ADD COLUMN "imageInputField" TEXT NOT NULL DEFAULT '';

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerImageInputMode" TEXT NOT NULL DEFAULT 'multipart',
  ADD COLUMN "providerImageInputField" TEXT NOT NULL DEFAULT '';
