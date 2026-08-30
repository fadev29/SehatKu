export function getBookingQrCodeUrl(bookingId?: string | null, size = 240) {
  if (!bookingId) return ''
  const query = new URLSearchParams({ size: String(size) })
  return `/api/bookings/${bookingId}/qr-code?${query.toString()}`
}
