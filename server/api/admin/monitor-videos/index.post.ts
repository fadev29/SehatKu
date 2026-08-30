import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { monitorAdSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const data = monitorAdSchema.parse(body);

  const monitorAd = await db.monitorAd.create({
    data: {
      title: data.title,
      youtubeUrl: data.youtubeUrl,
      isActive: data.isActive ?? true,
    },
  });

  return ok(monitorAd);
});
