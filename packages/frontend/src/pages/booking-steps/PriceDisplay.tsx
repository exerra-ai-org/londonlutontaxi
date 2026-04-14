import type { BookingData } from "../BookingFlow";
import { formatPrice } from "../../lib/format";
import { IconMapPin } from "../../components/icons";
import RouteMap from "../../components/maps/RouteMap";

interface Props {
  data: Partial<BookingData>;
  onNext: (fields: Partial<BookingData>) => void;
  onBack: () => void;
}

export default function PriceDisplay({ data, onNext, onBack }: Props) {
  const hasRouteCoords =
    data.pickupLat != null &&
    data.pickupLon != null &&
    data.dropoffLat != null &&
    data.dropoffLon != null;

  const price = data.pricePence ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="section-label">Step 03</p>
        <h2 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.04em] text-[var(--color-dark)]">
          Your quote
        </h2>
      </div>

      <div className="glass-card p-6 text-center">
        <div className="metric-value text-[56px]">{formatPrice(price)}</div>
        {data.routeName && (
          <div className="caption-copy mt-1">{data.routeName}</div>
        )}
        <div className="mono-label mt-2">
          {data.vehicleClass
            ? data.vehicleClass.charAt(0).toUpperCase() +
              data.vehicleClass.slice(1)
            : "Regular"}{" "}
          · {data.routeType === "fixed" ? "Fixed route" : "Mile-based"} pricing
        </div>
        {data.distanceMiles != null && data.routeType === "mile" && (
          <div className="caption-copy mt-2 space-y-0.5">
            <div>
              {data.distanceMiles.toFixed(1)} miles ×{" "}
              {data.ratePerMilePence != null
                ? formatPrice(data.ratePerMilePence) + "/mile"
                : ""}
            </div>
            {data.baseFarePence != null && data.baseFarePence > 0 && (
              <div>+ {formatPrice(data.baseFarePence)} base fare</div>
            )}
          </div>
        )}
        {data.isAirport && (
          <span className="ds-tag tag-airport mt-3 inline-flex">AIRPORT</span>
        )}
      </div>

      {hasRouteCoords && (
        <RouteMap
          pickup={{ lat: data.pickupLat!, lon: data.pickupLon! }}
          dropoff={{ lat: data.dropoffLat!, lon: data.dropoffLon! }}
        />
      )}

      <div className="page-card-muted space-y-3 p-4 text-sm">
        <div className="flex items-start gap-2">
          <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" />
          <span className="body-copy">{data.pickupAddress}</span>
        </div>
        <div className="flex items-start gap-2">
          <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-dark)]" />
          <span className="body-copy">{data.dropoffAddress}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary w-full flex-1">
          Back
        </button>
        <button
          onClick={() => onNext({})}
          className="btn-primary w-full flex-1"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
