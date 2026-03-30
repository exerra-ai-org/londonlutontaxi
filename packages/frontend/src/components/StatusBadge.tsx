import type { BookingStatus } from "shared/types";
import { statusLabel, statusColor } from "../lib/format";

export default function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}
