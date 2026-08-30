import { createError, readBody } from 'h3'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { getAdminSettings, setAdminSettings } from './_store'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Setting key is required'
    })
  }

  const body = await readBody<{ value?: unknown }>(event)
  if (!Object.prototype.hasOwnProperty.call(body ?? {}, 'value')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Field `value` is required'
    })
  }

  const current = await getAdminSettings()
  const next = {
    ...current,
    [key]: body.value
  }

  await setAdminSettings(next)

  return ok({
    key,
    value: body.value,
    settings: next
  })
})
