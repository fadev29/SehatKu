import { randomUUID } from "node:crypto";

export function generateQrToken() {
  return randomUUID();
}
