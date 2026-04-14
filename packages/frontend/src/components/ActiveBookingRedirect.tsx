import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listBookings } from "../api/bookings";
import { Skeleton } from "./Skeleton";

export default function ActiveBookingRedirect({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "customer") {
      setChecked(true);
      return;
    }

    listBookings()
      .then((data) => {
        const active = data.bookings.find((b) =>
          ["scheduled", "assigned", "en_route", "arrived"].includes(b.status),
        );
        if (active) {
          navigate(`/bookings/${active.id}`, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [user, authLoading, navigate]);

  if (authLoading || !checked) {
    return (
      <div className="mx-auto max-w-2xl py-12 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
