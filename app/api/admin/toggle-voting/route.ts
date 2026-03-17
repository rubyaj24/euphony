import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { dataApiFetch, getDataApiToken, toErrorResponse } from "@/lib/data-api";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = [
  "voting_enabled",
  "voting_eastern_solo",
  "voting_eastern_duet",
  "voting_western_solo",
  "voting_western_duet",
];

type RoleRow = { role: string };

export async function POST(request: Request) {
  try {
    const auth = getAuth();
    const { data: session } = await auth.getSession();
    const email = session?.user?.email?.toLowerCase();
    const userId = session?.user?.id;
    const sessionRole = (session?.user as { role?: string } | undefined)?.role?.toLowerCase();
    if (!userId && !email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }
    const token = tokenResult.token;

    let isRoleAdmin = sessionRole === "admin";
    if (!isRoleAdmin && userId) {
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

    if (!isRoleAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { key, enabled } = (await request.json()) as { key?: string; enabled?: boolean };
    if (!key || !ALLOWED_KEYS.includes(key) || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updateResult = await dataApiFetch<unknown[]>(
      token,
      `settings?key=eq.${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ value: enabled ? "true" : "false" }),
      },
    );
    if ("error" in updateResult) {
      return toErrorResponse(updateResult);
    }

    if (Array.isArray(updateResult.data) && updateResult.data.length === 0) {
      const insertResult = await dataApiFetch<unknown>(token, "settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ key, value: enabled ? "true" : "false" }),
      });
      if ("error" in insertResult) {
        return toErrorResponse(insertResult);
      }
    }

    return NextResponse.json({ success: true, [key]: enabled });
  } catch (err) {
    console.error("toggle-voting failed", err);
    return NextResponse.json(
      { error: "Failed to update voting settings", details: String(err) },
      { status: 500 },
    );
  }
}
