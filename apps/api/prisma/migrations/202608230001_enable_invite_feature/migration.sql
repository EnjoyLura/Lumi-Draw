INSERT INTO "app_settings" ("key", "value", "updatedAt")
VALUES (
  'inviteConfig',
  '{"enabled":true,"inviterReward":10,"inviteeReward":0,"cap":10}',
  NOW()
)
ON CONFLICT ("key") DO UPDATE SET
  "value" = jsonb_set(
    "app_settings"."value"::jsonb,
    '{enabled}',
    'true'::jsonb,
    true
  )::text,
  "updatedAt" = NOW();
