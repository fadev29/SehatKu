type PrinterProfileLite = {
  id: string
  name: string
  serviceUuid: string
  characteristicUuid: string
  writeMode?: string | null
}

function getChunkSize(writeMode?: string | null) {
  if (writeMode === 'bulk') return Number.MAX_SAFE_INTEGER
  return 120
}

type BluetoothWriteCharacteristic = BluetoothRemoteGATTCharacteristic & {
  properties: BluetoothCharacteristicProperties
}

const connectedPrinterId = ref('')
const connectedPrinterName = ref('')
const connectedDeviceName = ref('')
const isConnectingPrinter = ref(false)
const printerConnectError = ref('')

let activeDevice: BluetoothDevice | null = null
let activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
let activeProfile: PrinterProfileLite | null = null

function normalizeUuid(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function isWritableCharacteristic(characteristic: BluetoothWriteCharacteristic) {
  return Boolean(characteristic.properties.write || characteristic.properties.writeWithoutResponse)
}

async function findWritableCharacteristic(service: BluetoothRemoteGATTService, expectedUuid: string) {
  const characteristics = await service.getCharacteristics() as BluetoothWriteCharacteristic[]
  const normalizedExpected = normalizeUuid(expectedUuid)
  const exactMatch = characteristics.find((item) => normalizeUuid(item.uuid) === normalizedExpected)

  if (exactMatch && isWritableCharacteristic(exactMatch)) return exactMatch

  const writable = characteristics.find(isWritableCharacteristic)
  if (writable) return writable

  const listed = characteristics.map((item) => `${item.uuid} [${item.properties.write ? 'write' : ''}${item.properties.writeWithoutResponse ? '/writeWithoutResponse' : ''}]`).join(', ')
  throw new Error(`Printer terhubung, tapi characteristic tulis tidak ditemukan. Service: ${service.uuid}. Characteristic tersedia: ${listed || 'tidak ada'}`)
}

async function connectPrinterDevice(profile: PrinterProfileLite) {
  if (!import.meta.client || typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth hanya jalan di browser yang mendukung, disarankan Chrome Android.')
  }

  const knownDevices = typeof navigator.bluetooth.getDevices === 'function'
    ? await navigator.bluetooth.getDevices()
    : []

  const reusableDevice = knownDevices.find((item) => item.name === connectedDeviceName.value) || activeDevice
  const device = reusableDevice ?? await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [profile.serviceUuid]
  })

  connectedDeviceName.value = device.name || 'Printer BLE'

  if (!device.gatt?.connected) {
    await device.gatt?.connect()
  }

  const server = device.gatt
  if (!server?.connected) throw new Error('Gagal connect ke printer BLE')

  const services = await server.getPrimaryServices()
  const normalizedServiceUuid = normalizeUuid(profile.serviceUuid)
  const matchedService = services.find((item) => normalizeUuid(item.uuid) === normalizedServiceUuid)

  if (!matchedService) {
    const availableServices = services.map((item) => item.uuid).join(', ')
    throw new Error(`Service printer tidak cocok. Tersimpan: ${profile.serviceUuid}. Terdeteksi: ${availableServices || 'tidak ada'}`)
  }

  const characteristic = await findWritableCharacteristic(matchedService, profile.characteristicUuid)

  activeDevice = device
  activeCharacteristic = characteristic
  activeProfile = profile
  connectedPrinterId.value = profile.id
  connectedPrinterName.value = profile.name

  return { device, characteristic }
}

export function useStaffPrinter() {
  const isBluetoothSupported = computed(() => import.meta.client && typeof navigator !== 'undefined' && 'bluetooth' in navigator)

  async function ensurePrinterConnection(profile: PrinterProfileLite) {
    printerConnectError.value = ''
    isConnectingPrinter.value = true

    try {
      if (
        activeDevice?.gatt?.connected &&
        activeCharacteristic &&
        activeProfile?.id === profile.id
      ) {
        connectedPrinterId.value = profile.id
        connectedPrinterName.value = profile.name
        connectedDeviceName.value = activeDevice.name || connectedDeviceName.value || 'Printer BLE'
        return { device: activeDevice, characteristic: activeCharacteristic }
      }

      return await connectPrinterDevice(profile)
    } catch (error: any) {
      printerConnectError.value = error?.message || 'Gagal connect printer'
      throw error
    } finally {
      isConnectingPrinter.value = false
    }
  }

  async function writePayload(profile: PrinterProfileLite, payload: Uint8Array) {
    const { characteristic } = await ensurePrinterConnection(profile)
    const chunkSize = Math.min(payload.length, getChunkSize(profile.writeMode))

    for (let index = 0; index < payload.length; index += chunkSize) {
      const chunk = payload.slice(index, index + chunkSize)
      if ('writeValueWithoutResponse' in characteristic && typeof characteristic.writeValueWithoutResponse === 'function') {
        await characteristic.writeValueWithoutResponse(chunk)
      } else {
        await characteristic.writeValue(chunk)
      }
    }
  }

  function disconnectPrinter() {
    activeDevice?.gatt?.disconnect()
    activeDevice = null
    activeCharacteristic = null
    activeProfile = null
    connectedPrinterId.value = ''
    connectedPrinterName.value = ''
    connectedDeviceName.value = ''
  }

  return {
    isBluetoothSupported,
    isConnectingPrinter,
    printerConnectError,
    connectedPrinterId,
    connectedPrinterName,
    connectedDeviceName,
    ensurePrinterConnection,
    writePayload,
    disconnectPrinter,
  }
}
