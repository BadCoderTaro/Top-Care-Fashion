"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/AuthContext";

function SignInContent() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // Check for success or error messages from URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setStatus(success);
    } else if (error) {
      setStatus(error);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Signing in...");


    try {

      // Ensure email has no duplicate cases from db
      const normalizedEmail = email.trim().toLowerCase();

      await signIn(normalizedEmail, password);
      setStatus("Success");
      router.push("/");
    } catch (err: any) {
      const errorMessage = err?.message || "Sign in failed";

      // Check if email is not verified
      if (errorMessage.includes("Unverified Email") || errorMessage.includes("verify your email")) {
        // Redirect to verify email page with email as query param
        router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }

      setStatus(errorMessage);
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <section className="max-w-md w-full">
        <h1 className="text-3xl font-semibold mb-8">Welcome to TOP!</h1>

        {status && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            status.includes("successfully") || status.includes("Success")
              ? "bg-green-50 text-green-800 border border-green-200"
              : status.includes("failed") || status.includes("error") || status.includes("Error")
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {status}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          className="w-full border border-gray-300 rounded-md px-4 py-3 bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <input
          type="password"
          className="w-full border border-gray-300 rounded-md px-4 py-3 bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />

        <div className="text-right">
          <a href="/reset-password" className="text-sm text-gray-600 hover:text-gray-800">Forgot Password?</a>
        </div>

        <button type="submit" className="w-full rounded-md text-white px-4 py-3 text-base font-medium transition-colors" style={{ backgroundColor: '#F54B3D' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E03A2D'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F54B3D'}>
          Login
        </button>
      </form>
      </section>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <section className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Login</h1>
      </section>
    }>
      <SignInContent />
    </Suspense>
  );
}
