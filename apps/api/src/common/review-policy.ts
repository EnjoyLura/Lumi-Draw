import type { PrismaService } from "../prisma/prisma.service";

export async function requiresManualReview(prisma: PrismaService) {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["reviewMode", "manualReviewEnabled"] } },
    select: { key: true, value: true }
  });
  const settings = new Map(rows.map((row) => [row.key, row.value]));
  const mode = settings.get("reviewMode");
  if (mode === "auto") return false;
  if (mode === "manual") return true;
  return (settings.get("manualReviewEnabled") ?? "true") === "true";
}
