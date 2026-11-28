import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError, Booking, SlotView, cancelBooking, formatRange, getAvailableSlots, getBooking, rescheduleBooking } from "../api.js";

const CANCELLATION_NOTICE_MS = 24 * 60 * 60 * 1000;

export default function BookingDetail() {
  const { id = "" } = useParams();
  const justBooked = (useLocation().state as { justBooked?: boolean } | null)?.justBooked;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [movedTo, setMovedTo] = useState<string | null>(null);

  useEffect(() => {
    getBooking(id)
      .then((r) => setBooking(r.booking))
      .catch((err: Error) => setError(err instanceof ApiError && err.status === 404 ? "Booking not found." : err.message));
  }, [id]);

  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;
  if (!booking) return <p className="text-body-secondary" role="status">Loading booking…</p>;

  const canChange = booking.status === "ACTIVE" &&
    new Date(booking.slot.startAt).getTime() - Date.now() >= CANCELLATION_NOTICE_MS;

  async function loadAlternativeSlots() {
    setSlots(null);
    setPickerError(null);
    try {
      const result = await getAvailableSlots();
      setSlots(result.slots.filter((slot) => slot.id !== booking!.slot.id));
    } catch (err) {
      setPickerError(err instanceof Error ? err.message : "Unable to load available times.");
    }
  }

  function openPicker() {
    setActionError(null);
    setMovedTo(null);
    setPickerOpen(true);
    setSelectedSlotId(null);
    void loadAlternativeSlots();
  }

  async function handleMove() {
    if (!booking || selectedSlotId === null) return;
    const selected = slots?.find((slot) => slot.id === selectedSlotId);
    if (!selected || !window.confirm(`Move your booking from ${formatRange(booking.slot.startAt, booking.slot.endAt)} to ${formatRange(selected.startAt, selected.endAt)}?`)) return;
    setActionError(null);
    setMoving(true);
    try {
      const result = await rescheduleBooking(booking.id, selectedSlotId);
      setBooking(result.booking);
      setMovedTo(formatRange(result.booking.slot.startAt, result.booking.slot.endAt));
      setPickerOpen(false);
      setSlots(null);
      setSelectedSlotId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "The booking could not be moved.");
      setSelectedSlotId(null);
      await loadAlternativeSlots();
    } finally {
      setMoving(false);
    }
  }

  async function handleCancel() {
    if (!booking || !window.confirm("Cancel this booking?")) return;
    setActionError(null);
    setCancelling(true);
    try {
      const result = await cancelBooking(booking.id);
      setBooking(result.booking);
      setCancelled(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "The booking could not be cancelled.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 560 }} data-testid="booking-detail">
      {justBooked && booking.status === "ACTIVE" && <div className="alert alert-success m-3 mb-0" role="status">Your booking is confirmed.</div>}
      <div className="card-body">
        <h1 className="h5">Your appointment</h1>
        {cancelled && <div className="alert alert-success" role="status">Booking cancelled. This time is available again.</div>}
        {movedTo && <div className="alert alert-success" role="status">Booking moved to {movedTo}.</div>}
        {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
        <dl className="row mb-3">
          <dt className="col-sm-3">When</dt><dd className="col-sm-9">{formatRange(booking.slot.startAt, booking.slot.endAt)}</dd>
          <dt className="col-sm-3">Specialist</dt><dd className="col-sm-9">{booking.slot.specialistName}</dd>
          <dt className="col-sm-3">Service</dt><dd className="col-sm-9">{booking.slot.scheduleName}</dd>
          <dt className="col-sm-3">Topic</dt><dd className="col-sm-9">{booking.topic}</dd>
          <dt className="col-sm-3">Status</dt><dd className="col-sm-9"><span className={`badge ${booking.status === "ACTIVE" ? "text-bg-success" : "text-bg-secondary"}`}>{booking.status === "ACTIVE" ? "Confirmed" : booking.status === "CANCELLED" ? "Cancelled" : booking.status}</span></dd>
        </dl>
        {canChange && <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn btn-outline-primary" disabled={cancelling || moving} onClick={openPicker}>Change time</button>
          <button type="button" className="btn btn-outline-danger" disabled={cancelling || moving} onClick={handleCancel}>{cancelling ? "Cancelling…" : "Cancel booking"}</button>
        </div>}
        {pickerOpen && canChange && <section className="border rounded p-3 mb-3" aria-label="Change booking time">
          <h2 className="h6">Choose a new time</h2>
          {slots === null && !pickerError && <p role="status">Loading available times…</p>}
          {pickerError && <div className="alert alert-danger" role="alert">{pickerError}</div>}
          {slots?.length === 0 && <p>No other times are available.</p>}
          {slots && slots.length > 0 && <>
            <label htmlFor="reschedule-slot" className="form-label">Available time</label>
            <select id="reschedule-slot" className="form-select" value={selectedSlotId ?? ""} onChange={(event) => setSelectedSlotId(Number(event.target.value) || null)}>
              <option value="">Choose a time</option>
              {slots.map((slot) => <option key={slot.id} value={slot.id}>{formatRange(slot.startAt, slot.endAt)} · {slot.specialistName} · {slot.scheduleName}</option>)}
            </select>
            <button type="button" className="btn btn-primary mt-3 me-2" disabled={selectedSlotId === null || moving} onClick={handleMove}>{moving ? "Moving…" : "Confirm change"}</button>
          </>}
          <button type="button" className="btn btn-outline-secondary mt-3" disabled={moving} onClick={() => setPickerOpen(false)}>Close</button>
        </section>}
        <Link to="/bookings">Back to my bookings</Link>
      </div>
    </section>
  );
}
