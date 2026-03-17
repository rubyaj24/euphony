import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { dataApiFetch, getDataApiToken, toErrorResponse } from "@/lib/data-api";

export const dynamic = "force-dynamic";

type RoleRow = { role: string };

export async function GET(request: Request) {
  try {
    const auth = getAuth();
    const { data: session } = await auth.getSession();
    const email = session?.user?.email?.toLowerCase();
    const userId = session?.user?.id;
    const sessionRole = (session?.user as { role?: string } | undefined)?.role?.toLowerCase();

    if (!userId && !email) {
      return NextResponse.json({ isAdmin: false });
    }
    if (sessionRole === "admin") {
      return NextResponse.json({ isAdmin: true });
    }

    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }
    const token = tokenResult.token;

    let isRoleAdmin = false;
    if (userId) {
      const rolesByUserResult = await dataApiFetch<RoleRow[]>(
        token,
        `roles?user_id=eq.${encodeURIComponent(userId)}&role=eq.admin&select=role&limit=1`,
      );
      if ("error" in rolesByUserResult) {
        return toErrorResponse(rolesByUserResult);
      }
      isRoleAdmin = rolesByUserResult.data.length > 0;
    }

    if (!isRoleAdmin && email) {
      const rolesByEmailResult = await dataApiFetch<RoleRow[]>(
        token,
        `roles?email=ilike.${encodeURIComponent(email)}&role=eq.admin&select=role&limit=1`,
      );
      if ("error" in rolesByEmailResult) {
        return toErrorResponse(rolesByEmailResult);
      }
      isRoleAdmin = rolesByEmailResult.data.length > 0;
    }

    return NextResponse.json({ isAdmin: isRoleAdmin });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to determine admin status", details: String(err) },
      { status: 500 },
    );
  }
}
