import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, SlotView, createBooking, dayKey, formatRange, formatTime, getAvailableSlots, groupByDay } from "../api.js";

const serviceKey = (s: SlotView) => `${s.scheduleName}|${s.specialistName}`;

export default function SlotsPage() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [service, setService] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    return getAvailableSlots()
      .then((r) => setSlots(r.slots))
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const services = useMemo(() => {
    const found = new Map<string, { key: string; first: SlotView; count: number }>();
    for (const s of slots ?? []) {
      const key = serviceKey(s);
      const entry = found.get(key);
      if (entry) entry.count += 1;
      else found.set(key, { key, first: s, count: 1 });
    }
    return [...found.values()];
  }, [slots]);

  const days = useMemo(
    () => groupByDay((slots ?? []).filter((s) => serviceKey(s) === service)),
    [slots, service]
  );
  // A day can disappear when its last time is taken, so fall back to the soonest remaining day.
  const activeDay = days.find((d) => d.key === day) ?? days[0];
  const selected = activeDay?.items.find((s) => s.id === slotId) ?? null;

  function chooseService(key: string) {
    setService(key);
    setDay(null);
    setSlotId(null);
    setError(null);
  }

  function chooseDay(key: string) {
    setDay(key);
    setSlotId(null);
  }

  async function onBook(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setFieldError(null);
    setSubmitting(true);
    try {
      const { booking } = await createBooking(selected.id, topic);
      navigate(`/bookings/${booking.id}`, { state: { justBooked: true } });
    } catch (err) {
      if (err instanceof ApiError && err.code === "SLOT_TAKEN") {
        setError("Another customer has just taken this time. Please choose another.");
        setSlotId(null);
        await load();
      } else if (err instanceof ApiError && err.fields.topic) {
        setFieldError(err.fields.topic);
      } else {
        setError(err instanceof Error ? err.message : "Unable to book this time.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-3">Book an appointment</h1>
      {error && <div className="alert alert-warning" role="alert">{error}</div>}
      {loadError && <div className="alert alert-danger" role="alert">{loadError}</div>}
      {!slots && !loadError && <p className="text-body-secondary" role="status">Loading available times…</p>}
      {slots?.length === 0 && <p>No times are available right now. Please check again later.</p>}

      {services.length > 0 && (
        <section className="mb-4">
          <h2 className="h6">1. Choose a service</h2>
          <div className="row g-2">
            {services.map(({ key, first, count }) => (
              <div className="col-sm-6" key={key}>
                <button
                  type="button"
                  aria-pressed={key === service}
                  className={`btn w-100 text-start ${key === service ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => chooseService(key)}
                >
                  <span className="d-block fw-semibold">{first.scheduleName}</span>
                  <span className="d-block small">{first.specialistName}</span>
                  <span className="d-block small">{count} {count === 1 ? "time" : "times"} available</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeDay && (
        <section className="mb-4">
          <h2 className="h6" id="day-label">2. Choose a day</h2>
          <div role="group" aria-label="Choose a day" className="d-flex flex-wrap gap-2">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                aria-pressed={d.key === activeDay.key}
                className={`btn btn-sm ${d.key === activeDay.key ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => chooseDay(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {activeDay && (
        <section className="mb-4">
          <h2 className="h6">3. Choose a time</h2>
          <div role="group" aria-label="Choose a time" className="d-flex flex-wrap gap-2">
            {activeDay.items.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === slotId}
                className={`btn btn-sm ${s.id === slotId ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setSlotId(s.id)}
              >
                {formatTime(s.startAt)}
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && dayKey(selected.startAt) === activeDay?.key && (
        <section className="card">
          <div className="card-body">
            <h2 className="h6">4. Confirm your appointment</h2>
            <p className="mb-2">
              <strong>{selected.scheduleName}</strong> with {selected.specialistName}
              <br />
              {formatRange(selected.startAt, selected.endAt)}
            </p>
            <form onSubmit={onBook} noValidate>
              <label htmlFor="topic" className="form-label">What would you like to discuss?</label>
              <input id="topic" className={`form-control ${fieldError ? "is-invalid" : ""}`} value={topic} onChange={(e) => setTopic(e.target.value)} />
              {fieldError && <div className="invalid-feedback">{fieldError}</div>}
              <button type="submit" className="btn btn-primary mt-3" disabled={submitting}>
                {submitting ? "Booking…" : "Confirm booking"}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
