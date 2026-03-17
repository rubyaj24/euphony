import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { dataApiFetch, getDataApiToken, toErrorResponse } from "@/lib/data-api";

export const dynamic = "force-dynamic";

type RoleRow = { role: string };
type SettingsRow = { key: string; value: string };

const VOTING_KEYS = [
  "voting_enabled",
  "voting_eastern_solo",
  "voting_eastern_duet",
  "voting_western_solo",
  "voting_western_duet",
];

export async function GET(request: Request) {
  try {
    const auth = getAuth();
    const { data: session } = await auth.getSession();
    const email = session?.user?.email?.toLowerCase() ?? null;
    const userId = session?.user?.id ?? null;
    const sessionRole = (session?.user as { role?: string } | undefined)?.role?.toLowerCase() ?? null;

    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }
    const token = tokenResult.token;

    let adminByUserId = false;
    if (userId) {
      const rolesByUserResult = await dataApiFetch<RoleRow[]>(
        token,
        `roles?user_id=eq.${encodeURIComponent(userId)}&role=eq.admin&select=role&limit=1`,
      );
      if ("error" in rolesByUserResult) {
        return toErrorResponse(rolesByUserResult);
      }
      adminByUserId = rolesByUserResult.data.length > 0;
    }

    let adminByEmail = false;
    if (email) {
      const rolesByEmailResult = await dataApiFetch<RoleRow[]>(
        token,
        `roles?email=ilike.${encodeURIComponent(email)}&role=eq.admin&select=role&limit=1`,
      );
      if ("error" in rolesByEmailResult) {
        return toErrorResponse(rolesByEmailResult);
      }
      adminByEmail = rolesByEmailResult.data.length > 0;
    }

    const settingsResult = await dataApiFetch<SettingsRow[]>(
      token,
      `settings?key=in.(${VOTING_KEYS.join(",")})&select=key,value`,
    );
    if ("error" in settingsResult) {
      return toErrorResponse(settingsResult);
    }

    const settings: Record<string, string> = {};
    for (const row of settingsResult.data) {
      settings[row.key] = row.value;
    }

    const isAdmin = sessionRole === "admin" || adminByUserId || adminByEmail;

    return NextResponse.json({
      session: {
        userId,
        email,
        role: sessionRole,
      },
      adminChecks: {
        sessionRoleAdmin: sessionRole === "admin",
        roleTableByUserId: adminByUserId,
        roleTableByEmail: adminByEmail,
        isAdmin,
      },
      votingSettings: settings,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Debug endpoint failed", details: String(err) },
      { status: 500 },
    );
  }
}
