import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getMyProfile } from "../api/drivers";

interface GuardCtx {
  missing: string[];
  recheck: () => Promise<boolean>;
}

const DriverGuardCtx = createContext<GuardCtx | null>(null);

export function useDriverGuard() {
  return useContext(DriverGuardCtx);
}

function computeMissing(
  profile: {
    vehicleMake?: string | null;
    licensePlate?: string | null;
    vehicleClass?: string | null;
  } | null,
): string[] {
  const out: string[] = [];
  if (!profile?.vehicleMake) out.push("vehicle make");
  if (!profile?.licensePlate) out.push("license plate");
  if (!profile?.vehicleClass) out.push("vehicle class");
  return out;
}

export default function DriverGuard() {
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);
  const [complete, setComplete] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  const recheck = useCallback((): Promise<boolean> => {
    return getMyProfile()
      .then(({ driver }) => {
        const m = computeMissing(driver.profile);
        setComplete(m.length === 0);
        setMissing(m);
        setInitialized(true);
        return m.length === 0;
      })
      .catch(() => {
        setComplete(true);
        setMissing([]);
        setInitialized(true);
        return true;
      });
  }, []);

  // Check once on mount only — Profile page calls recheck() after saving
  useEffect(() => {
    recheck();
  }, [recheck]);

  if (!initialized) {
    return (
      <div className="flex justify-center py-20">
        <div className="caption-copy">Loading…</div>
      </div>
    );
  }

  if (!complete && location.pathname !== "/driver/profile") {
    return (
      <Navigate
        to="/driver/profile"
        replace
        state={{ incomplete: true, missing }}
      />
    );
  }

  return (
    <DriverGuardCtx.Provider value={{ missing, recheck }}>
      <Outlet />
    </DriverGuardCtx.Provider>
  );
}
