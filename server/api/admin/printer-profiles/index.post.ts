import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { printerProfileSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const data = printerProfileSchema.parse(body);

  const profile = await db.printerProfile.create({
    data: {
      name: data.name,
      serviceUuid: data.serviceUuid,
      characteristicUuid: data.characteristicUuid,
      writeMode: data.writeMode,
      isActive: data.isActive ?? true,
    },
  });

  return ok(profile);
});
