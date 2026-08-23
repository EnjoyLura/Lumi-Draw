ALTER TABLE "users" ADD COLUMN "publicId" TEXT;

CREATE OR REPLACE FUNCTION generate_public_user_id()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet CONSTANT TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
  candidate TEXT;
BEGIN
  LOOP
    candidate := '露米_'
      || substr(alphabet, floor(random() * 36)::integer + 1, 1)
      || substr(alphabet, floor(random() * 36)::integer + 1, 1)
      || substr(alphabet, floor(random() * 36)::integer + 1, 1)
      || substr(alphabet, floor(random() * 36)::integer + 1, 1)
      || substr(alphabet, floor(random() * 36)::integer + 1, 1);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM "users" WHERE "publicId" = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

UPDATE "users" SET "publicId" = generate_public_user_id() WHERE "publicId" IS NULL;

ALTER TABLE "users"
  ALTER COLUMN "publicId" SET DEFAULT generate_public_user_id(),
  ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX "users_publicId_key" ON "users"("publicId");
