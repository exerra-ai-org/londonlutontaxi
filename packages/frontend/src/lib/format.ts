import type { BookingStatus } from "shared/types";

export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    scheduled: "Scheduled",
    assigned: "Assigned",
    en_route: "En Route",
    arrived: "Arrived",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

export function statusColor(status: BookingStatus): string {
  const colors: Record<BookingStatus, string> = {
    scheduled: "bg-blue-100/80 text-blue-700",
    assigned: "bg-yellow-100/80 text-yellow-600",
    en_route: "bg-orange-100/80 text-orange-600",
    arrived: "bg-purple-100/80 text-purple-600",
    completed: "bg-green-100/80 text-green-700",
    cancelled: "bg-red-100/80 text-red-600",
  };
  return colors[status] || "bg-gray-100 text-gray-500";
}
