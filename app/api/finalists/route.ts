import { NextResponse } from "next/server";
import { dataApiFetch, getDataApiToken, toErrorResponse } from "@/lib/data-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }

    const finalistsResult = await dataApiFetch<Array<Record<string, unknown>>>(
      tokenResult.token,
      "finalists?select=uuid_id,name,track,round,city,avatar_url",
    );
    if ("error" in finalistsResult) {
      return toErrorResponse(finalistsResult);
    }

    const duetsResult = await dataApiFetch<Array<Record<string, unknown>>>(
      tokenResult.token,
      "duets?select=duet_name,member1_id,member2_id",
    );
    if ("error" in duetsResult) {
      return toErrorResponse(duetsResult);
    }

    return NextResponse.json({
      finalists: finalistsResult.data,
      duets: duetsResult.data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch finalists/duets from Data API", details: String(err) },
      { status: 500 },
    );
  }
}
