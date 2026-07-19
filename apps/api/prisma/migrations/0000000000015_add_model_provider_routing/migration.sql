ALTER TABLE "model_configs"
ADD COLUMN "providerRouting" JSONB NOT NULL DEFAULT '{}'::jsonb;
