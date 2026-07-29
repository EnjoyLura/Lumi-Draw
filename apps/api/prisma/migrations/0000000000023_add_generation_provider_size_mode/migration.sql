ALTER TABLE "generation_providers"
  ADD COLUMN "sizeMode" TEXT NOT NULL DEFAULT 'pixels',
  ADD COLUMN "pixelSizeField" TEXT NOT NULL DEFAULT 'size',
  ADD COLUMN "ratioField" TEXT NOT NULL DEFAULT 'size',
  ADD COLUMN "resolutionField" TEXT NOT NULL DEFAULT 'resolution';

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerSizeMode" TEXT NOT NULL DEFAULT 'pixels',
  ADD COLUMN "providerPixelSizeField" TEXT NOT NULL DEFAULT 'size',
  ADD COLUMN "providerRatioField" TEXT NOT NULL DEFAULT 'size',
  ADD COLUMN "providerResolutionField" TEXT NOT NULL DEFAULT 'resolution';
