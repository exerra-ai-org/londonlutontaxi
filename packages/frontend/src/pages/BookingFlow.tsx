import { useState } from "react";
import { useLocation } from "react-router-dom";
import LandingMap from "./LandingMap";
import PriceDisplay from "./booking-steps/PriceDisplay";
import CustomerDetails from "./booking-steps/CustomerDetails";
import CouponStep from "./booking-steps/CouponStep";
import Confirmation from "./booking-steps/Confirmation";

export interface BookingData {
  pickupAddress: string;
  pickupLat?: number;
  pickupLon?: number;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLon?: number;
  date: string;
  time: string;
  pricePence: number;
  routeType: "fixed" | "zone";
  routeName: string | null;
  isAirport: boolean;
  couponCode?: string;
  discountPence: number;
  finalPricePence: number;
}

const STEPS = [
  { num: 1, label: "Journey" },
  { num: 2, label: "Price" },
  { num: 3, label: "Details" },
  { num: 4, label: "Coupon" },
  { num: 5, label: "Confirm" },
];

export default function BookingFlow() {
  const location = useLocation();
  const prefill = location.state as {
    pickupAddress?: string;
    dropoffAddress?: string;
  } | null;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<BookingData>>({
    pickupAddress: prefill?.pickupAddress || "",
    dropoffAddress: prefill?.dropoffAddress || "",
    discountPence: 0,
  });

  function update(fields: Partial<BookingData>) {
    setData((prev) => ({ ...prev, ...fields }));
  }

  // Step 1: full-page immersive map
  if (step === 1) {
    return (
      <LandingMap
        data={data}
        onNext={(fields) => {
          update(fields);
          setStep(2);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl flex gap-8 py-2">
      {/* Vertical timeline */}
      <div className="hidden md:flex flex-col items-center pt-1 shrink-0">
        {STEPS.map(({ num, label }, i) => {
          const isActive = num === step;
          const isComplete = num < step;
          const isLast = i === STEPS.length - 1;
          return (
            <div key={num} className="flex flex-col items-center">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    isComplete
                      ? "bg-green-500/20 text-green-700 ring-2 ring-green-400/30"
                      : isActive
                        ? "bg-blue-100/80 text-blue-600 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/20"
                        : "bg-white/60 text-gray-500 ring-1 ring-black/5"
                  }`}
                >
                  {isComplete ? "✓" : num}
                </div>
                <span
                  className={`text-sm font-medium w-16 ${
                    isActive
                      ? "text-blue-600"
                      : isComplete
                        ? "text-green-700"
                        : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`w-px h-10 my-1 transition-colors ${
                    isComplete ? "bg-green-500/40" : "bg-black/5"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile step indicator */}
      <div className="md:hidden flex items-center gap-2 mb-4 w-full">
        {STEPS.map(({ num }) => (
          <div
            key={num}
            className={`h-1 flex-1 rounded-full transition-colors ${
              num < step
                ? "bg-green-500/60"
                : num === step
                  ? "bg-blue-500"
                  : "bg-black/5"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        {step === 2 && (
          <PriceDisplay
            data={data}
            onNext={(fields) => {
              update(fields);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <CustomerDetails
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <CouponStep
            pricePence={data.pricePence || 0}
            onNext={(fields) => {
              update(fields);
              setStep(5);
            }}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <Confirmation
            data={data as BookingData}
            onBack={() => setStep(4)}
            onReset={() => {
              setData({
                pickupAddress: "",
                dropoffAddress: "",
                discountPence: 0,
              });
              setStep(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
