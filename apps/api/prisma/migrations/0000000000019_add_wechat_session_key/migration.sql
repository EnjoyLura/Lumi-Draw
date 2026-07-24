ALTER TABLE "users" ADD COLUMN "wechatSessionKeyEncrypted" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "wechatSessionUpdatedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "wechatSessionUserIp" TEXT NOT NULL DEFAULT '';

ALTER TABLE "generate_jobs" ADD COLUMN "walletBillNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "generate_jobs" ADD COLUMN "walletRefunded" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "payment_orders" ADD COLUMN "walletBillNo" TEXT NOT NULL DEFAULT '';
