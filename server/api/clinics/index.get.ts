import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";

export default defineEventHandler(async () => {
  const clinics = await db.clinic.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return ok(clinics);
});
