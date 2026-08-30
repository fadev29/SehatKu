import { createError } from "h3";
import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { serviceSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const serviceId = getRouterParam(event, "serviceId");
  if (!serviceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Service ID is required",
    });
  }

  const body = await readBody(event);
  const data = serviceSchema.partial().parse(body);

  const service = await db.service.update({
    where: { id: serviceId },
    data,
  });

  return ok(service);
});
