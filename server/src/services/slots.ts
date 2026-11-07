import { getPrisma } from "../prisma.js";
import { HttpError, validation } from "./httpError.js";

export const MIN_SLOT_MINUTES = 15;
export const MAX_SLOT_MINUTES = 120;

// BR-03. A pure function so its boundaries can be unit tested.
export function validateSlotRule(startAt: Date, endAt: Date, now: Date): "PAST" | "DURATION" | null {
  if (startAt.getTime() <= now.getTime()) return "PAST";
  const minutes = (endAt.getTime() - startAt.getTime()) / 60_000;
  if (minutes < MIN_SLOT_MINUTES || minutes > MAX_SLOT_MINUTES) return "DURATION";
  return null;
}

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

const overlapError = () => new HttpError(409, "SLOT_OVERLAP", "This time overlaps another slot on the schedule.");

function isOverlapViolation(err: unknown): boolean {
  return err instanceof Error && (err.message.includes("slot_no_overlap") || err.message.includes("23P01"));
}

export async function createSlot(scheduleId: number, startAt: Date, endAt: Date, now = new Date()) {
  const failure = validateSlotRule(startAt, endAt, now);
  if (failure === "PAST") throw new HttpError(422, "SLOT_IN_PAST", "A slot must start in the future.");
  if (failure === "DURATION") {
    throw validation({ endAt: `A slot must last ${MIN_SLOT_MINUTES} to ${MAX_SLOT_MINUTES} minutes.` });
  }

  const prisma = getPrisma();
  // This check gives the normal case a clear answer. The exclusion constraint decides competing requests.
  const clash = await prisma.slot.findFirst({
    where: { scheduleId, startAt: { lt: endAt }, endAt: { gt: startAt } },
    select: { id: true },
  });
  if (clash) throw overlapError();

  try {
    return await prisma.slot.create({ data: { scheduleId, startAt, endAt } });
  } catch (err) {
    if (isOverlapViolation(err)) throw overlapError();
    throw err;
  }
}
