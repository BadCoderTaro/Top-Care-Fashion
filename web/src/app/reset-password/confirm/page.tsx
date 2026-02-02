"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase.browser";

type AuthParams = {
  token: string;
  code: string;
  email: string;
};

function parseAuthParams(): AuthParams {
  if (typeof window === "undefined") {
    return { token: "", code: "", email: "" };
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const urlParams = new URLSearchParams(window.location.search);

  // Try to extract token from various sources
  const token =
    hashParams.get("access_token") ||
    urlParams.get("access_token") ||
    hashParams.get("token") ||
    urlParams.get("token") ||
    "";

  const code = urlParams.get("code") || "";
  const email = urlParams.get("email") || "";

  return { token: token ?? "", code: code ?? "", email: email ?? "" };
}

export default function ConfirmResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const { token: nextToken, code: nextCode, email: nextEmail } = parseAuthParams();
    if (nextToken) setToken(nextToken);
    if (nextCode) setCode(nextCode);
    if (nextEmail) setEmail(nextEmail);
  }, []);

  useEffect(() => {
    // Check if user is already authenticated after clicking the reset link
    void (async () => {
      try {
        const supabase = createSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          setToken(session.access_token);
          setStatus(null);
          return;
        }

        // If no session but have code, try to verify
        if (code) {
          setVerifying(true);
          setStatus("Verifying reset link...");
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError || !data.session?.access_token) {
              console.error("Code exchange failed:", exchangeError);
              setStatus("Reset link is invalid or has expired. Please request a new one.");
            } else {
              setToken(data.session.access_token);
              setStatus(null);
            }
          } catch (err) {
            console.error("Code exchange threw:", err);
            setStatus("Reset link is invalid or has expired. Please request a new one.");
          } finally {
            setVerifying(false);
          }
        } else if (token && email) {
          // Fallback for old email format
          setVerifying(true);
          setStatus("Verifying reset link...");

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'recovery',
          });

          if (!verifyError && data.session?.access_token) {
            setToken(data.session.access_token);
            setStatus(null);
          } else if (verifyError) {
            console.error("Token verification failed:", verifyError);
            setStatus("Reset link is invalid or has expired. Please request a new one.");
          }
          setVerifying(false);
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("Something went wrong. Please try again.");
        setVerifying(false);
      }
    })();
  }, [code, token, email]);

  const tokenMissing = useMemo(() => token.trim().length === 0, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tokenMissing) {
      setStatus("Reset link is invalid or expired. Please request a new one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setStatus("Updating password...");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to reset password");
      }
      setStatus("Password updated successfully. Redirecting to sign-in...");
      setTimeout(() => router.push("/signin"), 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Set a new password</h1>
      {tokenMissing ? (
        <p className="mt-6 text-sm text-red-600">
          The reset link is invalid or has expired. Please request a new password reset email.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="text-sm">
          New password
          <input
            type="password"
            className="mt-1 w-full border border-black/10 rounded-md px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          <span className="text-xs text-gray-500 mt-1 block">Minimum 6 characters</span>
        </label>
        <label className="text-sm">
          Confirm password
          <input
            type="password"
            className="mt-1 w-full border border-black/10 rounded-md px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
          <span className="text-xs text-gray-500 mt-1 block">Must match the password above</span>
        </label>
        <button
          type="submit"
        className="inline-flex items-center rounded-md bg-[var(--brand-color)] text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
        disabled={submitting || tokenMissing || verifying}
      >
        {submitting ? "Saving..." : "Save new password"}
      </button>
    </form>
    {status ? <p className="mt-4 text-sm">{status}</p> : null}
  </section>
  );
}
