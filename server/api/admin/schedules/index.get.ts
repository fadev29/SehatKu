import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const schedules = await db.schedule.findMany({
    include: {
      doctor: true,
    },
    orderBy: [
      { scheduleDate: "desc" },
      { startTime: "asc" },
    ],
  });

  return ok(schedules);
});
