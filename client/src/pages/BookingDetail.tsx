import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError, Booking, cancelBooking, formatRange, getBooking } from "../api.js";

const CANCELLATION_NOTICE_MS = 24 * 60 * 60 * 1000;

export default function BookingDetail() {
  const { id = "" } = useParams();
  const justBooked = (useLocation().state as { justBooked?: boolean } | null)?.justBooked;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    getBooking(id)
      .then((r) => setBooking(r.booking))
      .catch((err: Error) => setError(err instanceof ApiError && err.status === 404 ? "Booking not found." : err.message));
  }, [id]);

  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;
  if (!booking) return <p className="text-body-secondary" role="status">Loading booking…</p>;

  const canCancel = booking.status === "ACTIVE" &&
    new Date(booking.slot.startAt).getTime() - Date.now() >= CANCELLATION_NOTICE_MS;

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
        {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
        <dl className="row mb-3">
          <dt className="col-sm-3">When</dt><dd className="col-sm-9">{formatRange(booking.slot.startAt, booking.slot.endAt)}</dd>
          <dt className="col-sm-3">Specialist</dt><dd className="col-sm-9">{booking.slot.specialistName}</dd>
          <dt className="col-sm-3">Service</dt><dd className="col-sm-9">{booking.slot.scheduleName}</dd>
          <dt className="col-sm-3">Topic</dt><dd className="col-sm-9">{booking.topic}</dd>
          <dt className="col-sm-3">Status</dt><dd className="col-sm-9"><span className={`badge ${booking.status === "ACTIVE" ? "text-bg-success" : "text-bg-secondary"}`}>{booking.status === "ACTIVE" ? "Confirmed" : booking.status === "CANCELLED" ? "Cancelled" : booking.status}</span></dd>
        </dl>
        {canCancel && <button type="button" className="btn btn-outline-danger mb-3" disabled={cancelling} onClick={handleCancel}>{cancelling ? "Cancelling…" : "Cancel booking"}</button>}
        <Link to="/bookings">Back to my bookings</Link>
      </div>
    </section>
  );
}
