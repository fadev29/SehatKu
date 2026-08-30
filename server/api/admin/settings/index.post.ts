import { readBody } from 'h3'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { getAdminSettings, setAdminSettings } from './_store'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<Record<string, unknown>>(event)
  const current = await getAdminSettings()
  const next = {
    ...current,
    ...body
  }

  await setAdminSettings(next)

  return ok(next)
})
