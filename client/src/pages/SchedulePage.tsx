import { FormEvent, useEffect, useState } from "react";
import { ApiError, Schedule, ScheduleSlot, addMinutes, bangkokToIso, createSlot, formatTime, getMySchedules, getScheduleSlots, groupByDay } from "../api.js";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMySchedules()
      .then((r) => {
        setSchedules(r.schedules);
        setScheduleId(r.schedules[0]?.id ?? null);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    if (scheduleId !== null) loadSlots(scheduleId);
  }, [scheduleId]);

  function loadSlots(id: number) {
    setSlots(null);
    setSlotsError(null);
    return getScheduleSlots(id)
      .then((r) => setSlots(r.slots))
      .catch((err: Error) => setSlotsError(err.message));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (scheduleId === null) return;
    setFields({});
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const startAt = bangkokToIso(date, time);
      await createSlot(scheduleId, startAt, addMinutes(startAt, duration));
      setTime("");
      setNotice("Time added.");
      await loadSlots(scheduleId);
    } catch (err) {
      setFields(err instanceof ApiError ? err.fields : {});
      setError(err instanceof Error ? err.message : "Unable to add this time.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <div className="alert alert-danger" role="alert">{loadError}</div>;
  if (!schedules) return <p className="text-body-secondary" role="status">Loading schedules…</p>;
  if (schedules.length === 0) return <p>No schedules are assigned to you yet.</p>;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-3">My schedule</h1>
      <div className="mb-3">
        <label htmlFor="schedule" className="form-label">Service</label>
        <select id="schedule" className="form-select" value={scheduleId ?? ""} onChange={(e) => setScheduleId(Number(e.target.value))}>
          {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <section className="card mb-4">
        <div className="card-body">
          <h2 className="h6">Add an available time</h2>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          {notice && <div className="alert alert-success py-2" role="status">{notice}</div>}
          <form onSubmit={onCreate} noValidate className="row g-2">
            <div className="col-sm-4">
              <label htmlFor="date" className="form-label">Date</label>
              <input id="date" type="date" className={`form-control ${fields.startAt ? "is-invalid" : ""}`} value={date} onChange={(e) => setDate(e.target.value)} />
              {fields.startAt && <div className="invalid-feedback">{fields.startAt}</div>}
            </div>
            <div className="col-sm-4">
              <label htmlFor="time" className="form-label">Start time (Bangkok)</label>
              <input id="time" type="time" className={`form-control ${fields.startAt ? "is-invalid" : ""}`} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="col-sm-4">
              <label htmlFor="duration" className="form-label">Duration</label>
              <select id="duration" className="form-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
              </select>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Add time"}</button>
            </div>
          </form>
        </div>
      </section>

      <h2 className="h5">Times and bookings</h2>
      {slotsError && <div className="alert alert-danger" role="alert">{slotsError}</div>}
      {!slots && !slotsError && <p className="text-body-secondary" role="status">Loading slots…</p>}
      {slots?.length === 0 && <p>No slots on this schedule yet. Add an available time above.</p>}
      {slots && groupByDay(slots).map((day) => (
        <section key={day.key} className="mb-3">
          <h3 className="h6 text-body-secondary">{day.label}</h3>
          <div className="list-group">
            {day.items.map((slot) => (
              <div key={slot.id} className="list-group-item d-flex flex-wrap justify-content-between gap-2" data-testid="schedule-slot">
                <span className="fw-semibold">{formatTime(slot.startAt)} to {formatTime(slot.endAt)}</span>
                {slot.booking ? (
                  <span><span className="badge text-bg-primary me-2">Booked</span>{slot.booking.customer.name}: {slot.booking.topic}</span>
                ) : (
                  <span className="badge text-bg-light border align-self-center">Available</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
