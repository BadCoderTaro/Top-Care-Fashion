import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

export async function POST() {

  //ding cheng input - added console log to detect any forms of error
  console.log(" the route /api/auth/signout successfully accessed ");

  try {

  const supabase = await createSupabaseServer();

  // signout from supabase attempt with log details and warning for checking
  const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("SignOut from Supabase failed:", error.message);
    } else {
      console.log("Supabase session signout Successful");
    }

    //clear cookie session with success message if successful
  const res = NextResponse.json({ ok: true, message: "User account signed out successfully" });
    res.cookies.set("tc_session", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });

// added console log to double check the clearance of the legacy cookie

  console.log("tc_session cookie has been successfully cleared ");
    return res;
  } catch (err) {
    console.error("Error occured during sign-out:", err);
    return NextResponse.json({ ok: false, error: "Failed to signout" }, { status: 500 });
  }
}
