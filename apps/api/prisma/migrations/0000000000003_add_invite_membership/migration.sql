-- AlterTable
ALTER TABLE "users" ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedById" INTEGER,
ADD COLUMN     "memberExpireAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "invite_records" (
    "id" SERIAL NOT NULL,
    "inviterId" INTEGER NOT NULL,
    "inviteeId" INTEGER NOT NULL,
    "rewardInviter" INTEGER NOT NULL DEFAULT 0,
    "rewardInvitee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_records_inviteeId_key" ON "invite_records"("inviteeId");

-- CreateIndex
CREATE INDEX "invite_records_inviterId_idx" ON "invite_records"("inviterId");

-- CreateIndex
CREATE UNIQUE INDEX "users_inviteCode_key" ON "users"("inviteCode");

