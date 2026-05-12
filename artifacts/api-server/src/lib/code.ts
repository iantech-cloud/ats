import { randomBytes } from "crypto";

export function generateAccessCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateTransactionRef(type: "platform" | "bot"): string {
  const prefix = type === "platform" ? "PLT" : "BOT";
  const ts = Date.now();
  const rnd = randomBytes(3).toString("hex").toUpperCase();
  return `TXN-${prefix}-${ts}-${rnd}`;
}
