import { Router } from "express";
import { getPrisma } from "../prisma.js";

export const popularityRouter = Router();

const bangkokDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date) {
  return bangkokDate.format(date);
}

function startOfBangkokDay(date: Date) {
  return new Date(`${dateKey(date)}T00:00:00+07:00`);
}

popularityRouter.get("/popularity", async (_req, res, next) => {
  try {
    const now = new Date();
    const startAt = startOfBangkokDay(now);
    const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const bookings = await getPrisma().booking.findMany({
      where: {
        status: "ACTIVE",
        slot: { startAt: { gt: now, lt: endAt } },
      },
      select: { slot: { select: { startAt: true } } },
    });

    const counts = new Map<string, number>();
    for (const booking of bookings) {
      const key = dateKey(booking.slot.startAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(startAt.getTime() + index * 24 * 60 * 60 * 1000);
      const date = dateKey(day);
      return { date, bookings: counts.get(date) ?? 0 };
    });

    res.json({ days, totalBookings: bookings.length });
  } catch (error) {
    next(error);
  }
});
