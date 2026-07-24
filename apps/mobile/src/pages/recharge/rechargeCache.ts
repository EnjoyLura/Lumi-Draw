import type { PointRecord, RechargeTier } from "../points/pointsData";
import {
  fetchCreditRecordPage,
  fetchCreditsBalance,
  fetchRechargeTiers,
  reconcilePendingPayments
} from "../points/pointsService";

const RECORD_PAGE_SIZE = 20;

export interface RechargePageSnapshot {
  userId: number;
  balance: number;
  tiers: RechargeTier[];
  earn: { items: PointRecord[]; page: number; hasMore: boolean };
  spend: { items: PointRecord[]; page: number; hasMore: boolean };
  updatedAt: number;
}

let snapshot: RechargePageSnapshot | undefined;
let pending: Promise<RechargePageSnapshot> | undefined;
let pendingUserId = 0;

export function getRechargePageSnapshot(userId: number) {
  return snapshot?.userId === userId ? snapshot : undefined;
}

export async function refreshRechargePageSnapshot(userId: number, reconcile = false) {
  if (pending && pendingUserId === userId) return pending;
  pendingUserId = userId;
  pending = (async () => {
    if (reconcile) await reconcilePendingPayments().catch(() => undefined);
    const [balance, tiers, earn, spend] = await Promise.all([
      fetchCreditsBalance(),
      fetchRechargeTiers(),
      fetchCreditRecordPage("earn", 1, RECORD_PAGE_SIZE),
      fetchCreditRecordPage("spend", 1, RECORD_PAGE_SIZE)
    ]);
    snapshot = {
      userId,
      balance,
      tiers,
      earn: { items: earn.items, page: earn.page, hasMore: earn.hasMore },
      spend: { items: spend.items, page: spend.page, hasMore: spend.hasMore },
      updatedAt: Date.now()
    };
    return snapshot;
  })().finally(() => {
    pending = undefined;
    pendingUserId = 0;
  });
  return pending;
}

export function clearRechargePageSnapshot(userId?: number) {
  if (userId === undefined || snapshot?.userId === userId) snapshot = undefined;
}
