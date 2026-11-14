// Empty means same origin, as in the production container. Local development sets it in client/.env.
const API_URL = import.meta.env.VITE_API_URL ?? "";

export type Role = "CUSTOMER" | "STAFF";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fields: Record<string, string>;
  constructor(status: number, body: { error?: string; code?: string; fields?: Record<string, string> } | null) {
    super(body?.error ?? "The request could not be completed.");
    this.status = status;
    this.code = body?.code;
    this.fields = body?.fields ?? {};
  }
}

export const UNAUTHENTICATED_EVENT = "hairroot:unauthenticated";
const SILENT_401 = new Set(["/api/auth/login", "/api/auth/me"]);

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !SILENT_401.has(path)) window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export const login = (email: string, password: string) =>
  apiFetch<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const logout = () => apiFetch<void>("/api/auth/logout", { method: "POST" });
export const getMe = () => apiFetch<{ user: User }>("/api/auth/me");

export interface Schedule {
  id: number;
  name: string;
}

export const getMySchedules = () => apiFetch<{ schedules: Schedule[] }>("/api/schedules/mine");
export const createSlot = (scheduleId: number, startAt: string, endAt: string) =>
  apiFetch(`/api/schedules/${scheduleId}/slots`, { method: "POST", body: JSON.stringify({ startAt, endAt }) });

export interface SlotView {
  id: number;
  startAt: string;
  endAt: string;
  scheduleName: string;
  specialistName: string;
}

export interface Booking {
  id: number;
  status: string;
  topic: string;
  createdAt: string;
  slot: SlotView;
}

export const getAvailableSlots = () => apiFetch<{ slots: SlotView[] }>("/api/slots/available");
export const createBooking = (slotId: number, topic: string) =>
  apiFetch<{ booking: Booking }>("/api/bookings", { method: "POST", body: JSON.stringify({ slotId, topic }) });

export const getMyBookings = () => apiFetch<{ bookings: Booking[] }>("/api/bookings/mine");
export const getBooking = (id: string) => apiFetch<{ booking: Booking }>(`/api/bookings/${encodeURIComponent(id)}`);

export interface ScheduleSlot {
  id: number;
  startAt: string;
  endAt: string;
  booking: { id: number; topic: string; customer: { id: number; name: string } } | null;
}

export const getScheduleSlots = (scheduleId: number) =>
  apiFetch<{ slots: ScheduleSlot[] }>(`/api/schedules/${scheduleId}/slots`);

// A date and time from form inputs have no zone. All times in the product are Asia/Bangkok (SRS A-01).
export function bangkokToIso(date: string, time: string): string {
  return date && time ? new Date(`${date}T${time}:00+07:00`).toISOString() : "";
}

export function addMinutes(iso: string, minutes: number): string {
  return iso ? new Date(new Date(iso).getTime() + minutes * 60_000).toISOString() : "";
}

const ZONE = { timeZone: "Asia/Bangkok" } as const;
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { ...ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-GB", { ...ZONE, weekday: "short", day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("en-GB", { ...ZONE, hour: "2-digit", minute: "2-digit" });

export const dayKey = (iso: string) => DAY_KEY.format(new Date(iso));
export const formatDay = (iso: string) => DAY.format(new Date(iso));
export const formatTime = (iso: string) => TIME.format(new Date(iso));
export const formatRange = (startAt: string, endAt: string) =>
  `${formatDay(startAt)}, ${formatTime(startAt)} to ${formatTime(endAt)}`;

export function groupByDay<T extends { startAt: string }>(items: T[]): { key: string; label: string; items: T[] }[] {
  const days = new Map<string, { key: string; label: string; items: T[] }>();
  for (const item of items) {
    const key = dayKey(item.startAt);
    if (!days.has(key)) days.set(key, { key, label: formatDay(item.startAt), items: [] });
    days.get(key)!.items.push(item);
  }
  return [...days.values()];
}
