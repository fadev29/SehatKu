import { ok } from '~~/server/utils/api-response'
import { getAdminSettings } from '~~/server/api/admin/settings/_store'

export default defineEventHandler(async () => {
  const settings = await getAdminSettings()

  return ok({
    appName: settings.clinicName || 'Sehatku',
    title: settings.defaultMonitorLabel || 'Sistem Antrean Klinik',
    showClock: true,
    showTicker: settings.monitorTickerEnabled !== false,
    tickerSpeed: 'normal',
    queueLabel: 'Panggilan Saat Ini',
    soundRepeatCount: Number(settings.monitorSoundRepeatCount || 2)
  })
})
