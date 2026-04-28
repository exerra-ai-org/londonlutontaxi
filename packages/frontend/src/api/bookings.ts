import { api } from "./client";
import type {
  Booking,
  BookingStatus,
  DriverLocation,
  Vehicle,
  VehicleClass,
} from "shared/types";

// Customer-scope GET /api/bookings adds these fields per backend spec.
export type CustomerBooking = Booking & {
  primaryDriverName?: string | null;
  primaryDriverPhone?: string | null;
  reviewRating?: number | null;
};

export interface BookingAssignment {
  id: number;
  driverId: number;
  role: "primary" | "backup";
  isActive: boolean;
  assignedAt: string;
  driverName: string;
  driverPhone: string | null;
  driverProfilePicture: string | null;
  driverProfile: {
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleColor: string | null;
    licensePlate: string | null;
    vehicleClass: string | null;
    bio: string | null;
  } | null;
  avgRating: number | null;
  totalReviews: number;
}

export interface BookingReview {
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface BookingDetail {
  booking: Booking;
  assignments: BookingAssignment[];
  vehicle?: Vehicle | null;
  review?: BookingReview | null;
}

export interface CreateBookingInput {
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  vehicleClass?: VehicleClass;
  pickupLat?: number;
  pickupLon?: number;
  dropoffLat?: number;
  dropoffLon?: number;
  couponCode?: string;
  pickupFlightNumber?: string;
  dropoffFlightNumber?: string;
}

export function createBooking(input: CreateBookingInput) {
  return api.post<{ booking: Booking }>("/api/bookings", input);
}

export function listBookings() {
  return api.get<{ bookings: CustomerBooking[] }>("/api/bookings");
}

export function getBooking(id: number) {
  return api.get<BookingDetail>(`/api/bookings/${id}`);
}

export interface UpdateBookingInput {
  scheduledAt?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupLat?: number | null;
  pickupLon?: number | null;
  dropoffLat?: number | null;
  dropoffLon?: number | null;
  pickupFlightNumber?: string | null;
  dropoffFlightNumber?: string | null;
}

export function updateBooking(id: number, input: UpdateBookingInput) {
  return api.patch<{ booking: Booking }>(`/api/bookings/${id}`, input);
}

export function updateBookingStatus(id: number, status: BookingStatus) {
  return api.patch<{ booking: Booking }>(`/api/bookings/${id}/status`, {
    status,
  });
}

export function cancelBooking(id: number) {
  return api.patch<{ booking: Booking }>(`/api/bookings/${id}/cancel`);
}

export function assignDrivers(
  id: number,
  primaryDriverId: number,
  backupDriverId: number,
) {
  return api.post<{ booking: Booking; assignments: BookingAssignment[] }>(
    `/api/bookings/${id}/assign`,
    { primaryDriverId, backupDriverId },
  );
}

export function triggerFallback(id: number) {
  return api.post<{ message: string; assignments: BookingAssignment[] }>(
    `/api/bookings/${id}/fallback`,
  );
}

export function getDriverLocation(id: number) {
  return api.get<DriverLocation>(`/api/bookings/${id}/driver-location`);
}

export interface Incident {
  id: number;
  bookingId: number;
  type: "emergency" | "contact_admin";
  message: string | null;
  createdAt: string;
}

export function reportIncident(
  id: number,
  type: "emergency" | "contact_admin",
  message?: string,
) {
  return api.post<{ incident: Incident }>(`/api/bookings/${id}/incident`, {
    type,
    message,
  });
}
