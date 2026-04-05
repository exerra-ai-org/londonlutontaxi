import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function CustomerDetails({ onNext, onBack }: Props) {
  const { user, login, register } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [mode, setMode] = useState<"check" | "found" | "new">(
    user ? "found" : "check",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckEmail() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const u = await login(email);
      setName(u.name);
      setPhone((u as { phone?: string }).phone || "");
      setMode("found");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setMode("new");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    setError("");
    try {
      await register(email, name, phone);
      onNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  // Already logged in — show confirmation
  if (user && mode === "found") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Details</h2>

        <div className="glass-card p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900">{user.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{user.phone}</span>
            </div>
          )}
        </div>

        <div className="glass-card !border-green-500/20 px-4 py-3 text-green-700 text-sm">
          Welcome back, {user.name}!
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="btn-secondary flex-1">
            Back
          </button>
          <button onClick={onNext} className="btn-primary flex-1">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Your Details</h2>
      <p className="text-sm text-gray-500">
        {mode === "check"
          ? "Enter your email to check if you have an account"
          : "Complete your details to continue"}
      </p>

      {error && (
        <div className="glass-card !border-red-500/20 px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (mode !== "check") setMode("check");
            }}
            required
            placeholder="you@example.com"
            className="input-glass flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && mode === "check") {
                e.preventDefault();
                handleCheckEmail();
              }
            }}
          />
          {mode === "check" && (
            <button
              onClick={handleCheckEmail}
              disabled={loading || !email.trim()}
              className="btn-primary !py-2 !px-4 text-sm"
            >
              {loading ? "..." : "Check"}
            </button>
          )}
        </div>
      </div>

      {mode === "new" && (
        <>
          <div className="glass-card !border-blue-500/20 px-4 py-3 text-blue-700 text-sm">
            No account found — fill in your details to create one
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Smith"
              className="input-glass w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="07700 000 000"
              className="input-glass w-full"
            />
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        {mode === "new" && (
          <button
            onClick={handleRegister}
            disabled={loading || !name.trim() || !phone.trim()}
            className="btn-primary flex-1"
          >
            {loading ? "Creating account..." : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
