UPDATE "app_settings"
SET
  "value" = jsonb_set(
    jsonb_set("value"::jsonb, '{inviterReward}', '10'::jsonb, true),
    '{inviteeReward}',
    '10'::jsonb,
    true
  )::text,
  "updatedAt" = NOW()
WHERE "key" = 'inviteConfig';
