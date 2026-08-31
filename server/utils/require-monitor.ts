import { createError } from 'h3'
import { auth } from '~~/server/utils/auth'

export async function requireMonitor(
  event: Parameters<typeof auth.api.getSession>[0]
) {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  if (session.user.role !== 'monitor' && session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}
