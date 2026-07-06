ALTER TABLE "works" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "works"
SET "tags" = ARRAY["style"]
WHERE "style" <> '' AND cardinality("tags") = 0;
