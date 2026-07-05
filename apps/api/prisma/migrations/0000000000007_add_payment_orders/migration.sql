CREATE TABLE "payment_orders" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "channel" TEXT NOT NULL DEFAULT 'wechat',
    "amountFen" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "rechargeTierId" INTEGER,
    "memberPlanId" INTEGER,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "memberDays" INTEGER NOT NULL DEFAULT 0,
    "transactionId" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_orders_orderNo_key" ON "payment_orders"("orderNo");
CREATE INDEX "payment_orders_userId_createdAt_idx" ON "payment_orders"("userId", "createdAt");
CREATE INDEX "payment_orders_status_createdAt_idx" ON "payment_orders"("status", "createdAt");

ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
