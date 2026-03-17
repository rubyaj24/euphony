import { NextResponse } from "next/server";
import { dataApiFetch, getDataApiToken, toErrorResponse } from "@/lib/data-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }

    const scheduleResult = await dataApiFetch<Array<Record<string, unknown>>>(
      tokenResult.token,
      "schedule?select=id,time,track,round,venue&order=time.asc"
    );
    if ("error" in scheduleResult) {
      return toErrorResponse(scheduleResult);
    }

    return NextResponse.json({ schedule: scheduleResult.data });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch schedule from Data API", details: String(err) },
      { status: 500 },
    );
  }
}
