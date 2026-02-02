"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <section className="max-w-md w-full">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight mb-4">
            Email Verified Successfully!
          </h1>

          <p className="text-gray-600 mb-8">
            Your email address has been successfully verified. You can now login to your account.
          </p>

          <div className="space-y-4">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center w-full rounded-md bg-[var(--brand-color)] text-white px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Login Now
            </Link>

            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center w-full rounded-md border border-black/10 px-4 py-3 text-sm font-medium hover:bg-black/5 transition-colors"
            >
              Go to Home
            </button>
          </div>

          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>What&apos;s next?</strong> Login with your email and password to start using your account.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

