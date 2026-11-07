import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Booking, formatRange, getMyBookings } from "../api.js";

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyBookings()
      .then((r) => setBookings(r.bookings))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <h1 className="h4 mb-3">My bookings</h1>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {!bookings && !error && <p className="text-body-secondary" role="status">Loading your bookings…</p>}
      {bookings?.length === 0 && <p>You have no bookings yet. <Link to="/slots">Find an available time</Link>.</p>}
      <div className="list-group">
        {bookings?.map((b) => (
          <Link key={b.id} to={`/bookings/${b.id}`} className="list-group-item list-group-item-action" data-testid="booking">
            <div className="fw-semibold">{formatRange(b.slot.startAt, b.slot.endAt)}</div>
            <div className="small text-body-secondary">{b.slot.advisorName} · {b.topic}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
