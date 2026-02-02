import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase";
import { Gender, Prisma, UserRole, UserStatus } from "@prisma/client";

function mapRole(role: UserRole | null | undefined): "User" | "Admin" {
  return role === UserRole.ADMIN ? "Admin" : "User";
}

function mapStatus(status: UserStatus | null | undefined): "active" | "suspended" {
  return status === UserStatus.SUSPENDED ? "suspended" : "active";
}

function mapGenderOut(value: Gender | null | undefined): "Male" | "Female" | null {
  if (!value) return null;

  // Handle new enum values
  if (value === "Men" as Gender) return "Male";
  if (value === "Women" as Gender) return "Female";
  if (value === "Unisex" as Gender) return null;

  // Backward compatibility with old enum (will be removed after migration)
  if (value === "MALE" as Gender) return "Male";
  if (value === "FEMALE" as Gender) return "Female";

  return null;
}

function mapGenderIn(value: "Male" | "Female" | "Unisex" | null): Gender | null {
  if (!value) return null;
  if (value === "Male") return "Men" as Gender;
  if (value === "Female") return "Women" as Gender;
  if (value === "Unisex") return "Unisex" as Gender;
  return null;
}

function extractValidationErrors(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? (error.meta?.target as string[]).join(",")
      : String(error.meta?.target ?? "");
    if (target.includes("email")) return "Email already registered";
    if (target.includes("supabase_user_id")) return "Account already linked";
  }
  return null;
}

/**
 * Resolve site URL for email redirects
 */
function resolveSiteUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SUPABASE_RESET_REDIRECT_URL ||
    process.env.APP_ORIGIN ||
    "";
  if (envUrl.trim()) return envUrl.trim().replace(/\/+$/, "");

  const origin = req.nextUrl.origin;
  return origin.replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  //ding cheng input
  console.log("🟢 Register route called");

  const body = await req.json().catch(() => ({}));
  const { username, email, password, dob, gender } = body as Record<string, unknown>;

  const normalizedUsername = typeof username === "string" ? username.trim() : "";
  //prevents duplicates of same email but diff lower and higher cases
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedUsername || !normalizedEmail || !normalizedPassword) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  console.log("📧 Email entered:", normalizedEmail);

  //ding cheng input for verification of valid/invalid email
  //I used regular expression(regex) for the email verification
  //ensure that regex is the exact same as the backend
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;
  
  
  //if statement to check if the entered email is true(valid) or false(invalid)
  if (!emailRegex.test(normalizedEmail)) {
  console.log("System detected invalid email format!");
  return NextResponse.json({ error: "Invalid e-mail entered, pls re-enter" }, { status: 400 });
}
console.log("✅ The email entered has passed regex check");

// Password validation
if (normalizedPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters long." },
      { status: 400 }
    );
  }



  // DOB and gender are now optional - can be set later in profile
  const trimmedDob = typeof dob === "string" ? dob.trim() : "";
  let normalizedDob: string | null = null;
  if (trimmedDob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob)) {
      return NextResponse.json({ error: "invalid dob" }, { status: 400 });
    }
    normalizedDob = trimmedDob;
  }

  let normalizedGender: "Male" | "Female" | "Unisex" | null = null;
  if (typeof gender === "string" && gender.trim()) {
    const trimmedGender = gender.trim();
    if (trimmedGender !== "Male" && trimmedGender !== "Female" && trimmedGender !== "Unisex") {
      return NextResponse.json({ error: "invalid gender" }, { status: 400 });
    }
    normalizedGender = trimmedGender as "Male" | "Female" | "Unisex";
  }

  const supabase = await createSupabaseServer();

  // Resolve redirect URL for email verification
  const redirectBase = resolveSiteUrl(req);
  const emailRedirectUrl = `${redirectBase}/verify-email/success`;
  
  console.log('[register] redirectBase:', redirectBase);
  console.log('[register] emailRedirectUrl:', emailRedirectUrl);

  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        data: {
          username: normalizedUsername,
          dob: normalizedDob,
          gender: normalizedGender,
        },
        emailRedirectTo: emailRedirectUrl,
      },
    });

    //ding cheng input
    // code to mitigate supabase bugs or duplication errors
    if (signUpError) {
      console.error("signUp error from supabase:", signUpError.message);
    // logic to ensure registered email cannot be used again
    const msg = signUpError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return NextResponse.json({ error: "The email entered is already registered" }, { status: 409 });
      }

      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    const supaUser = signUpData.user;

    // mitigation of rare case of supabase bug of signup succeeding but no return 
    if (!supaUser) {
      console.error(" no user returned from successfully signup from supabase ");
      return NextResponse.json({ error: " detected irregular signup behavior, please retry again " }, { status: 500 });
    }

    const userGender = mapGenderIn(normalizedGender);

    const createdUser = await prisma.users
      .create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          supabase_user_id: supaUser.id,
          //ensure timezone has not bugs such as off-by-one
         dob: normalizedDob ? new Date(`${normalizedDob}T00:00:00Z`) : undefined,
          gender: userGender ?? undefined,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          is_premium: true,
          premium_until: true,
          dob: true,
          gender: true,
          likes_visibility: true,
          follows_visibility: true,
        },
      })
      .catch((error: unknown) => {
        const message = extractValidationErrors(error);
        if (message) {
          throw new NextResponse(JSON.stringify({ error: message }), { status: 409 });
        }
        throw error;
      });

    const user = {
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      role: mapRole(createdUser.role),
      status: mapStatus(createdUser.status),
      isPremium: Boolean(createdUser.is_premium),
      premiumUntil: createdUser.premium_until ?? null,
      dob: createdUser.dob ? createdUser.dob.toISOString().slice(0, 10) : null,
      gender: mapGenderOut(createdUser.gender),
      likesVisibility: createdUser.likes_visibility ?? "PUBLIC",
      followsVisibility: createdUser.follows_visibility ?? "PUBLIC",
    };

    return NextResponse.json({ user, requiresConfirmation: !supaUser.email_confirmed_at });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error("Register error:", error);
    const message = error instanceof Error ? error.message : "registration failed";
    return NextResponse.json({ error: message || "registration failed" }, { status: 400 });
  }
}
