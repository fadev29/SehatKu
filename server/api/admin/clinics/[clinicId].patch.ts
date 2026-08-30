import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { clinicSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const clinicId = getRouterParam(event, "clinicId");
  const body = await readBody(event);
  const data = clinicSchema.partial().parse(body);

  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data,
  });

  return ok(clinic);
});
