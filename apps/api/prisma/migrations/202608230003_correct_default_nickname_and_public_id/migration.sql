CREATE OR REPLACE FUNCTION generate_public_user_id()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  candidate TEXT;
BEGIN
  LOOP
    candidate := 'LUMI_'
      || substr(alphabet, floor(random() * 26)::integer + 1, 1)
      || substr(alphabet, floor(random() * 26)::integer + 1, 1)
      || substr(alphabet, floor(random() * 26)::integer + 1, 1)
      || substr(alphabet, floor(random() * 26)::integer + 1, 1);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM "users" WHERE "publicId" = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

UPDATE "users"
SET "publicId" = generate_public_user_id();

UPDATE "users"
SET "nickname" = '露米_'
  || substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::integer + 1, 1)
  || substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::integer + 1, 1)
  || substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::integer + 1, 1)
  || substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::integer + 1, 1)
  || substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::integer + 1, 1)
WHERE "nickname" ~ '^体验用户[0-9]+$';
