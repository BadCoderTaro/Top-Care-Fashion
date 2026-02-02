"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle username input - only allow letters, numbers, underscore, and hyphen
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow alphanumeric characters, underscore, and hyphen
    const filteredValue = value.replace(/[^a-zA-Z0-9_-]/g, '');
    setUsername(filteredValue);
  };

  // Handle email input - remove spaces
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove all spaces from email
    const filteredValue = value.replace(/\s/g, '');
    setEmail(filteredValue);
  };

  // Check username availability with debounce
  useEffect(() => {
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length === 0) {
      setUsernameError(null);
      setIsCheckingUsername(false);
      return;
    }

    // Validate username format: only letters, numbers, underscore, and hyphen
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setUsernameError("Username can only contain letters, numbers, underscore, and hyphen");
      setIsCheckingUsername(false);
      return;
    }

    if (trimmedUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);

    usernameTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmedUsername }),
        });

        const data = await res.json();
        if (data.usernameAvailable === false) {
          setUsernameError("Username is already taken");
        } else {
          setUsernameError(null);
        }
      } catch (error) {
        console.error("Error checking username:", error);
        // Don't show error on check failure, let backend handle it
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [username]);

  // Check email availability with debounce
  useEffect(() => {
    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length === 0) {
      setEmailError(null);
      setIsCheckingEmail(false);
      return;
    }

    // Check for spaces in email
    if (trimmedEmail.includes(' ')) {
      setEmailError("Email cannot contain spaces");
      setIsCheckingEmail(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError("Invalid email format");
      setIsCheckingEmail(false);
      return;
    }

    setIsCheckingEmail(true);
    setEmailError(null);

    emailTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        });

        const data = await res.json();
        if (data.emailAvailable === false) {
          setEmailError("Email is already registered");
        } else {
          setEmailError(null);
        }
      } catch (error) {
        console.error("Error checking email:", error);
        // Don't show error on check failure, let backend handle it
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
    };
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Clear previous status
    setStatus(null);

    // Check for validation errors
    if (usernameError || emailError) {
      setStatus("Please fix the errors above before submitting");
      return;
    }

    if (isCheckingUsername || isCheckingEmail) {
      setStatus("Please wait while we verify your information...");
      return;
    }

    // Validate username format before submission
    const trimmedUsername = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setStatus("Username can only contain letters, numbers, underscore, and hyphen");
      return;
    }

    if (trimmedUsername.length < 3) {
      setStatus("Username must be at least 3 characters");
      return;
    }

    // Validate email format before submission
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.includes(' ')) {
      setStatus("Email cannot contain spaces");
      return;
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setStatus("Invalid e-mail entered, pls re-enter a valid email");
      return;
    }

    setStatus("Submitting...");

    // ding cheng input

    //switching between my backend input(true) and superbase(false) for testing
    const USE_BACKEND = true;

    // Password validation
    if (password.length < 6) {
      setStatus("Password must be at least 6 characters long");
      return;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      setStatus("Passwords do not match");
      return;
    }

    try {
      if (USE_BACKEND) {
        // posting registration request to dingcheng's backend
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmedUsername, email: trimmedEmail, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Register failed");

        setStatus("Success! Please check your email to verify your account.");
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
        }, 1500);
      } else {

        //  use Supabase code(false)
        await signUp({ username: trimmedUsername, email: trimmedEmail, password });
        setStatus("Success! Please check your email to verify your account.");
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
        }, 1500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error("Registration error:", err);
      setStatus(`Registration failed: ${message}`);
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <section className="max-w-md w-full">
        <h1 className="text-3xl font-semibold mb-8">Welcome to TOP!</h1>

        {status && (
        <div className="mb-4 p-3 rounded-md text-sm bg-blue-50 text-blue-800 border border-blue-200">
          {status}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <input
            type="text"
            className={`w-full border rounded-md px-4 py-3 bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              usernameError
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 focus:ring-gray-300"
            }`}
            value={username}
            onChange={handleUsernameChange}
            placeholder="Username (letters, numbers, _, - only)"
            required
          />
          {isCheckingUsername && (
            <p className="mt-1 text-xs text-gray-500">Checking availability...</p>
          )}
          {usernameError && (
            <p className="mt-1 text-xs text-red-600">{usernameError}</p>
          )}
          {!usernameError && username.trim().length >= 3 && !isCheckingUsername && (
            <p className="mt-1 text-xs text-green-600">✓ Username available</p>
          )}
        </div>
        <div>
          <input
            type="email"
            className={`w-full border rounded-md px-4 py-3 bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              emailError
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 focus:ring-gray-300"
            }`}
            value={email}
            onChange={handleEmailChange}
            placeholder="Email (no spaces)"
            required
          />
          {isCheckingEmail && (
            <p className="mt-1 text-xs text-gray-500">Checking availability...</p>
          )}
          {emailError && (
            <p className="mt-1 text-xs text-red-600">{emailError}</p>
          )}
          {!emailError && 
           email.trim().length > 0 && 
           !isCheckingEmail && 
           /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/.test(email.trim().toLowerCase()) && (
            <p className="mt-1 text-xs text-green-600">✓ Email available</p>
          )}
        </div>
        <input
          type="password"
          className="w-full border border-gray-300 rounded-md px-4 py-3 bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          minLength={6}
          required
        />
        <input
          type="password"
          className="w-full border border-gray-300 rounded-md px-4 py-3 bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          minLength={6}
          required
        />
        <button
          type="submit"
          className="w-full rounded-md bg-gray-800 text-white px-4 py-3 text-base font-medium hover:bg-gray-700 transition-colors"
        >
          Register
        </button>
      </form>
      </section>
    </div>
  );
}
