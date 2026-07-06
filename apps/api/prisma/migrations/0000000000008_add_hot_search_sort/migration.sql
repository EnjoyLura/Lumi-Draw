ALTER TABLE "hot_searches" ADD COLUMN "sort" INTEGER NOT NULL DEFAULT 0;

UPDATE "hot_searches" SET "sort" = "id" WHERE "sort" = 0;
