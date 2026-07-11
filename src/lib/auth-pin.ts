import { createHash } from "crypto";

const SALT = "fsr::";

export function hashPin(pin: string): string {
  return createHash("sha256").update(`${SALT}${pin}`).digest("hex");
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}
