INSERT INTO "app_settings" ("key", "value", "updatedAt") VALUES
  ('reviewMode', 'manual', NOW()),
  ('manualReviewEnabled', 'true', NOW()),
  ('creditsConfig', '{"registerGift":50,"publishReward":2,"favoriteReward":0,"inviteReward":10}', NOW()),
  ('checkinConfig', '{"base":2,"tiers":[2,2,2,3,3,3,5]}', NOW()),
  ('inviteConfig', '{"enabled":false,"inviterReward":10,"inviteeReward":0,"cap":10}', NOW())
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updatedAt" = NOW();

INSERT INTO "recharge_tiers" ("id", "price", "credits", "bonus", "enabled", "sort", "createdAt", "updatedAt") VALUES
  (1, 6, 600, 0, true, 1, NOW(), NOW()),
  (2, 18, 1800, 60, true, 2, NOW(), NOW()),
  (3, 30, 3000, 150, true, 3, NOW(), NOW()),
  (4, 68, 6800, 480, true, 4, NOW(), NOW()),
  (5, 128, 12800, 1280, true, 5, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "price" = EXCLUDED."price",
  "credits" = EXCLUDED."credits",
  "bonus" = EXCLUDED."bonus",
  "enabled" = EXCLUDED."enabled",
  "sort" = EXCLUDED."sort",
  "updatedAt" = NOW();

SELECT setval(pg_get_serial_sequence('recharge_tiers', 'id'), GREATEST((SELECT MAX("id") FROM "recharge_tiers"), 1));

INSERT INTO "member_plans" ("id", "name", "price", "rights", "giftCredits", "checkinBonus", "milestoneBonus", "publishBonus", "enabled", "sort", "createdAt", "updatedAt") VALUES
  (1, '月卡', 18, '开通赠送100积分·签到额外+1·发布额外+1', 100, 1, 2, 1, true, 1, NOW(), NOW()),
  (2, '季卡', 48, '开通赠送300积分·签到额外+2·发布额外+2', 300, 2, 4, 2, true, 2, NOW(), NOW()),
  (3, '年卡', 168, '开通赠送1200积分·签到额外+3·发布额外+3', 1200, 3, 6, 3, true, 3, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "price" = EXCLUDED."price",
  "rights" = EXCLUDED."rights",
  "giftCredits" = EXCLUDED."giftCredits",
  "checkinBonus" = EXCLUDED."checkinBonus",
  "milestoneBonus" = EXCLUDED."milestoneBonus",
  "publishBonus" = EXCLUDED."publishBonus",
  "enabled" = EXCLUDED."enabled",
  "sort" = EXCLUDED."sort",
  "updatedAt" = NOW();

SELECT setval(pg_get_serial_sequence('member_plans', 'id'), GREATEST((SELECT MAX("id") FROM "member_plans"), 1));

UPDATE "model_configs" SET "costCredits" = 20, "updatedAt" = NOW() WHERE "id" = 'gpt-image-2';
UPDATE "quality_configs" SET "multiplier" = 1.0, "updatedAt" = NOW() WHERE "label" ILIKE '%1K%';
UPDATE "quality_configs" SET "multiplier" = 1.6, "updatedAt" = NOW() WHERE "label" ILIKE '%2K%';
UPDATE "quality_configs" SET "multiplier" = 2.4, "updatedAt" = NOW() WHERE "label" ILIKE '%4K%';
