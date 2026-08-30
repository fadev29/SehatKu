import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const videos = await db.monitorAd.findMany({
    orderBy: { createdAt: "desc" },
  });

  return ok(videos);
});
