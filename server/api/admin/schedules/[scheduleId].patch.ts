import { createError } from "h3";
import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { scheduleSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const scheduleId = getRouterParam(event, "scheduleId");
  if (!scheduleId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Schedule ID is required",
    });
  }

  const body = await readBody(event);
  const data = scheduleSchema.partial().parse(body);

  const schedule = await db.schedule.update({
    where: { id: scheduleId },
    data: {
      ...data,
      scheduleDate: data.scheduleDate ? new Date(data.scheduleDate) : undefined,
    },
  });

  return ok(schedule);
});
