import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: "desc" },
  });

  return ok(clinics);
});
