import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth.js";
import { AuthProvider, roleHome, useAuth } from "./context/AuthContext.js";
import BookingDetail from "./pages/BookingDetail.js";
import Login from "./pages/Login.js";
import MyBookings from "./pages/MyBookings.js";
import SchedulePage from "./pages/SchedulePage.js";
import SlotsPage from "./pages/SlotsPage.js";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-4 text-body-secondary" role="status">Loading…</p>;
  return <Navigate to={user ? roleHome(user.role) : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/slots" element={<RequireAuth role="CUSTOMER"><SlotsPage /></RequireAuth>} />
          <Route path="/bookings" element={<RequireAuth role="CUSTOMER"><MyBookings /></RequireAuth>} />
          <Route path="/bookings/:id" element={<RequireAuth role="CUSTOMER"><BookingDetail /></RequireAuth>} />
          <Route path="/schedule" element={<RequireAuth role="STAFF"><SchedulePage /></RequireAuth>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
