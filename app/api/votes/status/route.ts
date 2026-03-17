import { NextResponse } from "next/server";
import { dataApiFetch, getDataApiToken, toErrorResponse } from "@/lib/data-api";

export const dynamic = "force-dynamic";

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
    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }

    const encodedKeys = VOTING_KEYS.join(",");
    const settingsResult = await dataApiFetch<SettingsRow[]>(
      tokenResult.token,
      `settings?key=in.(${encodedKeys})&select=key,value`,
    );
    if ("error" in settingsResult) {
      return toErrorResponse(settingsResult);
    }

    const status: Record<string, boolean> = {};
    for (const row of settingsResult.data) {
      status[row.key] = row.value === "true";
    }
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch voting status", details: String(err) },
      { status: 500 },
    );
  }
}
