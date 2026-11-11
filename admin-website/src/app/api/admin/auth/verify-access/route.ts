import { NextResponse } from "next/server";
import { hasAdminPortalAccess } from "@francis/shared";
import { getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const session = await getSignedInSessionInfo();
  if (!session) {
    return NextResponse.json(
      { allowed: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (session.status === "suspended") {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        allowed: false,
        error: "This staff account is currently suspended.",
      },
      { status: 403 }
    );
  }

  if (!hasAdminPortalAccess(session.roles)) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        allowed: false,
        error:
          "Access denied: Customer accounts cannot log into the Admin Portal. Only Super Admin, Admin, Support Agent (Customer Support), and Content Manager roles are allowed.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    allowed: true,
    userId: session.userId,
    email: session.email,
    fullName: session.fullName,
    roles: session.roles,
  });
}
