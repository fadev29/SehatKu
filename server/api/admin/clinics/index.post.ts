import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { clinicSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const data = clinicSchema.parse(body);

  const clinic = await db.clinic.create({
    data: {
      name: data.name,
      address: data.address,
      isActive: data.isActive ?? true,
    },
  });

  return ok(clinic);
});
