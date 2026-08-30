import { getAuthSession } from "~~/app/utils/auth";

export default defineNuxtRouteMiddleware(async (to) => {
  const session = await getAuthSession();

  if (!session?.user) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
