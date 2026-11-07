import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, SlotView, createBooking, formatRange, getAvailableSlots } from "../api.js";

export default function SlotsPage() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SlotView | null>(null);
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

  async function onBook(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setFieldError(null);
    setSubmitting(true);
    try {
      const { booking } = await createBooking(selected.id, topic);
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SLOT_TAKEN") {
        setError("Another customer has just taken this time. The list has been refreshed.");
        setSelected(null);
        setTopic("");
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
    <>
      <h1 className="h4 mb-3">Available times</h1>
      {error && <div className="alert alert-warning" role="alert">{error}</div>}
      {loadError && <div className="alert alert-danger" role="alert">{loadError}</div>}
      {!slots && !loadError && <p className="text-body-secondary" role="status">Loading available times…</p>}
      {slots?.length === 0 && <p>No times are available right now. Please check again later.</p>}
      <div className="list-group mb-4">
        {slots?.map((slot) => (
          <div key={slot.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2" data-testid="slot">
            <div>
              <div className="fw-semibold">{formatRange(slot.startAt, slot.endAt)}</div>
              <div className="small text-body-secondary">{slot.specialistName} · {slot.scheduleName}</div>
            </div>
            <button className="btn btn-outline-primary btn-sm" onClick={() => { setSelected(slot); setFieldError(null); }}>Book</button>
          </div>
        ))}
      </div>
      {selected && (
        <section className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <h2 className="h6">Book {formatRange(selected.startAt, selected.endAt)}</h2>
            <form onSubmit={onBook} noValidate>
              <label htmlFor="topic" className="form-label">What would you like to discuss?</label>
              <input id="topic" className={`form-control mb-2 ${fieldError ? "is-invalid" : ""}`} value={topic} onChange={(e) => setTopic(e.target.value)} />
              {fieldError && <div className="invalid-feedback mb-2">{fieldError}</div>}
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Booking…" : "Confirm booking"}</button>
                <button type="button" className="btn btn-link" onClick={() => setSelected(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
