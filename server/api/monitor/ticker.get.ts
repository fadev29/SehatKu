import { ok } from '~~/server/utils/api-response'
import { getAdminSettings } from '~~/server/api/admin/settings/_store'

export default defineEventHandler(async () => {
  const settings = await getAdminSettings()
  const messages = Array.isArray(settings.monitorTickerMessages)
    ? settings.monitorTickerMessages.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  return ok(messages.length ? messages : [
    'Anda dipanggil',
    'Siapkan kartu identitas dan bukti booking',
    'Selamat datang di Klinik Sehatku',
    'Silakan tunggu panggilan sesuai nomor antrean'
  ])
})
