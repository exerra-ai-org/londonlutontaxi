import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvitation } from "../api/auth";
import { ApiError } from "../api/client";

export default function AcceptInvitation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Accept invitation";
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { user } = await acceptInvitation(token, password);
      setDone(true);
      const dest = user.role === "driver" ? "/driver" : "/admin";
      setTimeout(() => navigate(dest, { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-12 w-full max-w-[480px] animate-fade-in">
      <div className="page-card p-8 space-y-6">
        <div>
          <p className="section-label">/ Invitation</p>
          <h1 className="page-title mt-2">Set your password</h1>
          <p className="caption-copy mt-2">
            Create a password to activate your account.
          </p>
        </div>

        {done ? (
          <div className="alert alert-success">
            Password set! Redirecting you now…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                New password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoFocus
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password" className="form-label">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={busy}
            >
              {busy ? "Activating…" : "Activate account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
