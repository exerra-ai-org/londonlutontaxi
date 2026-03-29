import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Placeholder pages — will be built in phases 1c-1e
function BookingFlow() {
  return <h1>Book a Ride</h1>;
}
function BookingHistory() {
  return <h1>My Bookings</h1>;
}
function Login() {
  return <h1>Login</h1>;
}

// Admin
function RideTimeline() {
  return <h1>Admin: Ride Timeline</h1>;
}
function DriverManagement() {
  return <h1>Admin: Drivers</h1>;
}
function CouponManagement() {
  return <h1>Admin: Coupons</h1>;
}

// Driver
function MyRides() {
  return <h1>Driver: My Rides</h1>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Customer */}
        <Route path="/" element={<BookingFlow />} />
        <Route path="/bookings" element={<BookingHistory />} />
        <Route path="/login" element={<Login />} />

        {/* Admin */}
        <Route path="/admin" element={<RideTimeline />} />
        <Route path="/admin/drivers" element={<DriverManagement />} />
        <Route path="/admin/coupons" element={<CouponManagement />} />

        {/* Driver */}
        <Route path="/driver" element={<MyRides />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
