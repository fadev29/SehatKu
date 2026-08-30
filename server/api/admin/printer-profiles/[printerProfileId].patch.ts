import { createError } from "h3";
import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { printerProfileSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const printerProfileId = getRouterParam(event, "printerProfileId");
  if (!printerProfileId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Printer profile ID is required",
    });
  }

  const body = await readBody(event);
  const data = printerProfileSchema.partial().parse(body);

  const profile = await db.printerProfile.update({
    where: { id: printerProfileId },
    data,
  });

  return ok(profile);
});
