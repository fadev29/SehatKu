import { createError } from "h3";
import { db } from "~~/server/database";
import { ok } from "~~/server/utils/api-response";
import { requireAdmin } from "~~/server/utils/require-admin";
import { monitorAdSchema } from "~~/shared/validators/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const videoId = getRouterParam(event, "videoId");
  if (!videoId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Video ID is required",
    });
  }

  const body = await readBody(event);
  const data = monitorAdSchema.partial().parse(body);

  const video = await db.monitorAd.update({
    where: { id: videoId },
    data,
  });

  return ok(video);
});
