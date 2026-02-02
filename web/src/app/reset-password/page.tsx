"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
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
    setStatus("Sending password reset email...");

    try {
      await resetPassword(email.trim().toLowerCase());
      setStatus("Password reset email sent! Please check your inbox and spam folder.");
      setEmailSent(true);
      setCooldown(60); // 60 seconds cooldown
    } catch (error: any) {
      const message = error?.message || "Failed to send password reset email.";
      setStatus(message);
      setEmailSent(false);
    } finally {
      setIsLoading(false);
    }
  }

  function getEmailProviderUrl(email: string) {
    const domain = email.split("@")[1]?.toLowerCase();

    if (!domain) return null;

    // 根据邮箱域名返回对应的邮件服务网址
    if (domain.includes("gmail.com")) {
      return "https://mail.google.com";
    } else if (domain.includes("outlook.com") || domain.includes("hotmail.com") || domain.includes("live.com")) {
      return "https://outlook.live.com";
    } else if (domain.includes("yahoo.com")) {
      return "https://mail.yahoo.com";
    } else if (domain.includes("163.com")) {
      return "https://mail.163.com";
    } else if (domain.includes("qq.com")) {
      return "https://mail.qq.com";
    } else if (domain.includes("126.com")) {
      return "https://mail.126.com";
    } else if (domain.includes("icloud.com") || domain.includes("me.com")) {
      return "https://www.icloud.com/mail";
    }

    // 默认返回通用的 mailto 链接
    return `mailto:${email}`;
  }

  function handleOpenEmail() {
    const url = getEmailProviderUrl(email);
    if (url) {
      window.open(url, "_blank");
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <section className="max-w-md w-full">
        <h1 className="text-3xl font-semibold mb-2">Forgot Password?</h1>

        <p className="text-sm text-gray-500 mb-8">
          Don't worry! It occurs. Please enter the email address linked with your account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          className="w-full border border-gray-300 rounded-md px-4 py-3 bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />

        <button
          type="submit"
          disabled={isLoading || cooldown > 0}
          className="w-full rounded-md bg-gray-800 text-white px-4 py-3 text-base font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading
            ? "Sending..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Send Code"}
        </button>
      </form>

      {status && emailSent && (
        <div className="mt-4">
          <p className="text-sm text-green-600 mb-3">
            {status}
          </p>

          <button
            onClick={handleOpenEmail}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Open Email App
          </button>
        </div>
      )}

      {status && !emailSent && (
        <p className="mt-4 text-sm text-gray-700">
          {status}
        </p>
      )}
      </section>
    </div>
  );
}
