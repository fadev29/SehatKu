import { getAuthSession, getHomeByRole } from "~~/app/utils/auth";

export default defineNuxtRouteMiddleware(async (to) => {
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (user.role !== "admin") {
    return navigateTo(getHomeByRole(user.role));
  }
});
