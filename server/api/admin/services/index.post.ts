import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { serviceSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const data = serviceSchema.parse(body);

  const service = await db.service.create({
    data: {
      clinicId: data.clinicId,
      name: data.name,
      isActive: data.isActive ?? true,
    },
  });

  return ok(service);
});
