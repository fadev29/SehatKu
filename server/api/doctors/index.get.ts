import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const clinicId = query.clinicId as string | undefined;
  const serviceId = query.serviceId as string | undefined;

  const doctors = await db.doctor.findMany({
    where: {
      isActive: true,
      ...(clinicId ? { clinicId } : {}),
      ...(serviceId ? { serviceId } : {}),
    },
    include: {
      clinic: true,
      service: true,
      schedules: true,
    },
    orderBy: { fullName: "asc" },
  });

  return ok(doctors);
});
