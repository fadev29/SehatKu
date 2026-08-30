import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { scheduleSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const data = scheduleSchema.parse(body);

  const schedule = await db.schedule.create({
    data: {
      doctorId: data.doctorId,
      scheduleDate: new Date(data.scheduleDate),
      startTime: data.startTime,
      endTime: data.endTime,
      quota: data.quota,
      isActive: data.isActive ?? true,
    },
  });

  return ok(schedule);
});
