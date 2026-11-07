import { getPrisma } from "../prisma.js";
import { validation } from "./httpError.js";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseSlotTimes(body: { startAt?: unknown; endAt?: unknown } | undefined) {
  const startAt = parseDate(body?.startAt);
  const endAt = parseDate(body?.endAt);
  const fields: Record<string, string> = {};
  if (!startAt) fields.startAt = "Enter a valid start time.";
  if (!endAt) fields.endAt = "Enter a valid end time.";
  if (!startAt || !endAt) throw validation(fields);
  return { startAt, endAt };
}

export async function createSlot(scheduleId: number, startAt: Date, endAt: Date) {
  return getPrisma().slot.create({ data: { scheduleId, startAt, endAt } });
}
