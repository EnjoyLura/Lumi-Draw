ALTER TABLE "generate_jobs"
ADD COLUMN "inputImageUrls" JSONB NOT NULL DEFAULT '[]';
