import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError, Booking, formatRange, getBooking } from "../api.js";

export default function BookingDetail() {
  const { id = "" } = useParams();
  const justBooked = (useLocation().state as { justBooked?: boolean } | null)?.justBooked;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBooking(id)
      .then((r) => setBooking(r.booking))
      .catch((err: Error) => setError(err instanceof ApiError && err.status === 404 ? "Booking not found." : err.message));
  }, [id]);

  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;
  if (!booking) return <p className="text-body-secondary" role="status">Loading booking…</p>;

  return (
    <section className="card" style={{ maxWidth: 560 }} data-testid="booking-detail">
      {justBooked && <div className="alert alert-success m-3 mb-0" role="status">Your booking is confirmed.</div>}
      <div className="card-body">
        <h1 className="h5">Your appointment</h1>
        <dl className="row mb-3">
          <dt className="col-sm-3">When</dt><dd className="col-sm-9">{formatRange(booking.slot.startAt, booking.slot.endAt)}</dd>
          <dt className="col-sm-3">Specialist</dt><dd className="col-sm-9">{booking.slot.specialistName}</dd>
          <dt className="col-sm-3">Service</dt><dd className="col-sm-9">{booking.slot.scheduleName}</dd>
          <dt className="col-sm-3">Topic</dt><dd className="col-sm-9">{booking.topic}</dd>
          <dt className="col-sm-3">Status</dt><dd className="col-sm-9"><span className="badge text-bg-success">{booking.status === "ACTIVE" ? "Confirmed" : booking.status}</span></dd>
        </dl>
        <Link to="/bookings">Back to my bookings</Link>
      </div>
    </section>
  );
}
