const SETTINGS_STORAGE_KEY = 'sehatku:admin-settings'

export const defaultAdminSettings = {
  clinicName: 'Sehatku',
  supportEmail: 'support@sehatku.local',
  timezone: 'Asia/Jakarta',
  monitorTickerEnabled: true,
  defaultMonitorLabel: 'Sistem Antrean Klinik',
  defaultPrinterMode: 'chunk',
  monitorTickerMessages: [
    'Anda dipanggil',
    'Siapkan kartu identitas dan bukti booking',
    'Selamat datang di Klinik Sehatku',
    'Silakan tunggu panggilan sesuai nomor antrean'
  ],
  monitorSoundRepeatCount: 2
} as const

export async function getAdminSettings() {
  const storage = useStorage()
  const saved = await storage.getItem<Record<string, unknown>>(SETTINGS_STORAGE_KEY)

  return {
    ...defaultAdminSettings,
    ...(saved ?? {})
  }
}

export async function setAdminSettings(value: Record<string, unknown>) {
  const storage = useStorage()
  await storage.setItem(SETTINGS_STORAGE_KEY, value)
  return value
}
