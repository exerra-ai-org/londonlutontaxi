import { useState } from "react";
import { validateCoupon } from "../../api/coupons";
import { formatPrice } from "../../lib/format";
import { ApiError } from "../../api/client";
import type { BookingData } from "../BookingFlow";

interface Props {
  pricePence: number;
  onNext: (fields: Partial<BookingData>) => void;
  onBack: () => void;
}

export default function CouponStep({ pricePence, onNext, onBack }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountPence: number;
  } | null>(null);

  async function handleApply() {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await validateCoupon(code.trim());
      if (!result.valid) {
        setError(result.reason || "Invalid coupon");
        return;
      }

      let discountPence = 0;
      if (result.discountType === "percentage") {
        discountPence = Math.round(
          (pricePence * (result.discountValue || 0)) / 100,
        );
      } else {
        discountPence = Math.min(result.discountValue || 0, pricePence);
      }

      setApplied({
        code: result.code || code,
        discountType: result.discountType || "fixed",
        discountValue: result.discountValue || 0,
        discountPence,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to validate");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    onNext({
      couponCode: applied?.code,
      discountPence: applied?.discountPence || 0,
      finalPricePence: pricePence - (applied?.discountPence || 0),
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Have a Coupon?</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="input-glass w-full flex-1"
        />
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="bg-gray-100 text-gray-900 px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {loading ? "..." : "Apply"}
        </button>
      </div>

      {error && (
        <div className="glass-card !border-red-300/40 px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      {applied && (
        <div className="glass-card !border-green-300/40 px-4 py-3 text-green-700 text-sm">
          <div className="font-medium">Coupon applied: {applied.code}</div>
          <div>
            {applied.discountType === "percentage"
              ? `${applied.discountValue}% off`
              : `${formatPrice(applied.discountValue)} off`}
            {" — "}
            You save {formatPrice(applied.discountPence)}
          </div>
          <div className="mt-1 font-medium">
            New total: {formatPrice(pricePence - applied.discountPence)}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary w-full flex-1">
          Back
        </button>
        <button onClick={handleNext} className="btn-primary w-full flex-1">
          {applied ? "Continue" : "Skip"}
        </button>
      </div>
    </div>
  );
}
