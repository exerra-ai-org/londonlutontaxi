import type { Booking } from "shared/types";

interface Props {
  bookings: Booking[];
  onFilterUnassigned: () => void;
  onFilterStartingSoon: () => void;
}

export default function AlertsBanner({
  bookings,
  onFilterUnassigned,
  onFilterStartingSoon,
}: Props) {
  const unassigned = bookings.filter((b) => b.status === "scheduled").length;
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const startingSoon = bookings.filter(
    (b) =>
      (b.status === "scheduled" || b.status === "assigned") &&
      new Date(b.scheduledAt) <= twoHoursFromNow,
  ).length;

  if (!unassigned && !startingSoon) return null;

  return (
    <div className="flex gap-3 mb-4">
      {unassigned > 0 && (
        <button
          onClick={onFilterUnassigned}
          className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm flex-1 hover:bg-amber-100"
        >
          <span className="font-semibold">{unassigned}</span> ride
          {unassigned !== 1 ? "s" : ""} unassigned
        </button>
      )}
      {startingSoon > 0 && (
        <button
          onClick={onFilterStartingSoon}
          className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm flex-1 hover:bg-red-100"
        >
          <span className="font-semibold">{startingSoon}</span> ride
          {startingSoon !== 1 ? "s" : ""} starting within 2h
        </button>
      )}
    </div>
  );
}
