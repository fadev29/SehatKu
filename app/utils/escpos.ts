export type QueueTicketPayload = {
  clinicName: string
  queueNumber: string
  patientName: string
  doctorName: string
  serviceName?: string
  scheduleDate: string
  scheduleTime: string
  qrToken?: string | null
  footerText?: string
  printedAt?: string
}

function textBytes(value: string) {
  return Array.from(new TextEncoder().encode(value))
}

function qrBytes(value: string) {
  const storeLength = value.length + 3
  const pL = storeLength % 256
  const pH = Math.floor(storeLength / 256)

  return [
    0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
    0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04,
    0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31,
    0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30,
    ...textBytes(value),
    0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30,
  ]
}

const LINE_WIDTH = 32
const QUEUE_MODE = '\x1D!\x01'
const LINE_SPACING = '\x1B\x33\x14'
const FEED_AFTER = '\n\n'

function fit(value = '', width: number) {
  return value.length > width ? value.slice(0, width) : value
}

function center(value = '', width: number) {
  const safe = fit(value, width)
  const left = Math.max(0, Math.floor((width - safe.length) / 2))
  return `${' '.repeat(left)}${safe}`
}

function wrapLine(value = '', width: number) {
  const text = String(value || '').trim()
  if (!text) return ['']

  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }

    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`
      continue
    }

    lines.push(fit(current, width))
    current = word
  }

  if (current) lines.push(fit(current, width))
  return lines
}

function field(label: string, value = '', lineWidth = 32) {
  const prefix = `${label}: `
  return `${fit(prefix + value, lineWidth)}\n`
}

export function buildQueueTicketBytes(payload: QueueTicketPayload) {
  const divider = '-'.repeat(LINE_WIDTH)
  const lines = [
    ...textBytes('\x1B@'),
    ...textBytes('\x1B\x61\x01'),
    ...textBytes('\x1B\x21\x30'),
    ...textBytes(`${fit(payload.clinicName.toUpperCase(), LINE_WIDTH)}\n`),
    ...textBytes('\x1B\x21\x00'),
    ...textBytes(LINE_SPACING),
    ...textBytes('TIKET ANTREAN\n'),
    ...textBytes(`${divider}\n`),
    ...textBytes('\x1B\x61\x00'),
    ...textBytes(`Poli: ${fit((payload.serviceName || '-').toUpperCase(), LINE_WIDTH - 6)}\n`),
    ...textBytes('No. Antrean:\n'),
    ...textBytes('\x1B\x61\x01'),
    ...textBytes(QUEUE_MODE),
    ...textBytes(`${fit(payload.queueNumber.toUpperCase(), 12)}\n`),
    ...textBytes('\x1B\x21\x00'),
    ...textBytes(`${divider}\n`),
    ...textBytes('\x1B\x61\x00'),
    ...textBytes(`Tgl: ${payload.scheduleDate}  ${payload.scheduleTime}\n`),
    ...wrapLine(payload.footerText || 'Silakan menunggu hingga nomor Anda dipanggil', LINE_WIDTH).flatMap((item) => textBytes(`${item}\n`)),
    ...textBytes(`${divider}\n`),
  ]

  if (payload.qrToken) {
    lines.push(...textBytes('\x1B\x61\x01'))
    lines.push(...qrBytes(payload.qrToken))
    lines.push(...textBytes(FEED_AFTER))
  } else {
    lines.push(...textBytes(FEED_AFTER))
  }

  lines.push(...textBytes('\x1DV\x41\x03'))
  return new Uint8Array(lines)
}
