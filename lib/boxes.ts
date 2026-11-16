import "server-only";
import { randomInt } from "node:crypto";

// No 0/O, 1/I — matches the CHECK constraint on box_codes.code.
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Uppercases and strips spaces/hyphens (handles full-width input too). */
export function normalizeCode(raw: unknown): string {
  return typeof raw === "string" ? raw.normalize("NFKC").toUpperCase().replace(/[\s-]/g, "") : "";
}

export type Prize = { points: number; weight: number };

export function isPrizeTable(value: unknown): value is Prize[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 12 &&
    value.every(
      (p) =>
        p &&
        Number.isInteger(p.points) &&
        Math.abs(p.points) <= 10_000 &&
        typeof p.weight === "number" &&
        p.weight > 0 &&
        p.weight <= 10_000,
    )
  );
}
