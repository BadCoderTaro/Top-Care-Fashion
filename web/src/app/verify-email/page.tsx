"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function handleResendVerification(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      setStatus("Please enter your email address");
      return;
    }

    if (cooldown > 0) {
      setStatus(`Please wait ${cooldown} seconds before resending`);
      return;
    }

    setIsLoading(true);
    setStatus("Sending verification email...");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("Verification email sent! Please check your inbox and spam folder.");
        setCooldown(60); // 60 seconds cooldown
      } else {
        setStatus(data.error || "Failed to send verification email");
      }
    } catch (err) {
      setStatus("An error occurred. Please try again.");
      console.error("Resend verification error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Verify Your Email</h1>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          Your email address has not been verified yet. Please check your inbox for the verification email we sent when you signed up.
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium">Didn&apos;t receive the email?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address below and we&apos;ll send you a new verification link.
        </p>
      </div>

      <form onSubmit={handleResendVerification} className="mt-6 flex flex-col gap-4">
        <label className="text-sm">
          Email Address
          <input
            type="email"
            className="mt-1 w-full border border-black/10 rounded-md px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading || cooldown > 0}
          className="inline-flex items-center justify-center rounded-md bg-[var(--brand-color)] text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? "Sending..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend Verification Email"}
        </button>
      </form>

      {status && (
        <p className={`mt-4 text-sm ${status.includes("sent") || status.includes("Sent") ? "text-green-600" : "text-gray-700"}`}>
          {status}
        </p>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-gray-600">Already verified?</p>
          <button
            onClick={() => router.push("/signin")}
            className="text-[var(--brand-color)] hover:underline text-left"
          >
            Back to Sign In
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-900">Tips:</h3>
        <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email address</li>
          <li>Add our email to your contacts to prevent future emails from going to spam</li>
          <li>The verification link is valid for 24 hours</li>
        </ul>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <section className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Loading...</h1>
      </section>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
