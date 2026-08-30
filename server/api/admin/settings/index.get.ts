import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { getAdminSettings } from './_store'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  return ok(await getAdminSettings())
})
