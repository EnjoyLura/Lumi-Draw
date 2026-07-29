ALTER TABLE "gameplays"
  ADD COLUMN "prompt" TEXT NOT NULL DEFAULT '';

UPDATE "gameplays"
SET "prompt" = "description"
WHERE "prompt" = '';
