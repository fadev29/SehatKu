import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const profiles = await db.printerProfile.findMany({
    orderBy: { createdAt: "desc" },
  });

  return ok(profiles);
});
