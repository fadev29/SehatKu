import { getAuthSession, getHomeByRole } from "~~/app/utils/auth";

const publicPaths = new Set(["/", "/login", "/register"]);

export default defineNuxtRouteMiddleware(async (to) => {
  const session = await getAuthSession();
  const user = session?.user;
  const isGuestPage = to.path === "/login" || to.path === "/register";

  if (isGuestPage && user) {
    return navigateTo(getHomeByRole(user.role));
  }

  if (publicPaths.has(to.path)) {
    return;
  }

  if (!user) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (typeof to.meta.role === "string" && user.role !== to.meta.role) {
    return navigateTo(getHomeByRole(user.role));
  }
});
