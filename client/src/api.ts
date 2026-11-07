const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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

export const UNAUTHENTICATED_EVENT = "advisorbook:unauthenticated";
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
  advisorName: string;
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
  booking: { id: number; topic: string; student: { id: number; name: string } } | null;
}

export const getScheduleSlots = (scheduleId: number) =>
  apiFetch<{ slots: ScheduleSlot[] }>(`/api/schedules/${scheduleId}/slots`);

// A datetime-local value has no zone. All times in the product are Asia/Bangkok (SRS A-01).
export const bangkokToIso = (value: string) => (value ? new Date(`${value}:00+07:00`).toISOString() : "");

const FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

export function formatRange(startAt: string, endAt: string): string {
  return `${FORMAT.format(new Date(startAt))} to ${TIME.format(new Date(endAt))}`;
}
