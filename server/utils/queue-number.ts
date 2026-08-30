export function formatQueueNumber(sequence: number) {
  return `A-${String(sequence).padStart(2, "0")}`;
}
