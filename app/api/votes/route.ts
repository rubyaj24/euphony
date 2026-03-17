import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { dataApiFetch, getDataApiToken, toErrorResponse } from "@/lib/data-api";

export const dynamic = "force-dynamic";

type SettingsRow = { key: string; value: string };
type VoteRow = { finalist_id: number };
type FinalistRow = { id: number; uuid_id: string };
type VoteRound = "solo" | "dut";

async function getVotingEnabled(token: string) {
  const settingsResult = await dataApiFetch<SettingsRow[]>(
    token,
    "settings?key=eq.voting_enabled&select=key,value&limit=1",
  );
  if ("error" in settingsResult) {
    return settingsResult;
  }
  return { enabled: settingsResult.data[0]?.value === "true" } as const;
}

function isDuplicateVote(details?: string) {
  return Boolean(details && details.includes('"code":"23505"'));
}

function normalizeVoteRound(input: string): VoteRound | null {
  const value = input.trim().toLowerCase();
  if (value === "solo") return "solo";
  if (value === "duet" || value === "dut") return "dut";
  return null;
}

export async function GET(request: Request) {
  try {
    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }
    const token = tokenResult.token;

    const votingEnabledResult = await getVotingEnabled(token);
    if ("error" in votingEnabledResult) {
      return toErrorResponse(votingEnabledResult);
    }
    if (!votingEnabledResult.enabled) {
      return NextResponse.json({ error: "Voting is not enabled by admin." }, { status: 403 });
    }

    const [votesResult, finalistsResult] = await Promise.all([
      dataApiFetch<VoteRow[]>(token, "votes?select=finalist_id"),
      dataApiFetch<FinalistRow[]>(token, "finalists?select=id,uuid_id"),
    ]);

    if ("error" in votesResult) {
      return toErrorResponse(votesResult);
    }
    if ("error" in finalistsResult) {
      return toErrorResponse(finalistsResult);
    }

    const finalistIdToUuid = new Map<number, string>();
    for (const finalist of finalistsResult.data) {
      finalistIdToUuid.set(finalist.id, finalist.uuid_id);
    }
    const finalistUuids = new Set(finalistsResult.data.map((f) => f.uuid_id));
    const counts: Record<string, number> = {};

    for (const row of votesResult.data) {
      const uuidId = finalistIdToUuid.get(row.finalist_id);
      if (uuidId) {
        counts[uuidId] = (counts[uuidId] ?? 0) + 1;
      }
    }

    // Ensure all finalists are present in the result, with zero if no votes
    for (const uuid of finalistUuids) {
      if (!(uuid in counts)) {
        counts[uuid] = 0;
      }
    }

    return NextResponse.json(counts);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch vote counts", details: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuth();
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokenResult = await getDataApiToken(request);
    if ("error" in tokenResult) {
      return toErrorResponse(tokenResult);
    }
    const token = tokenResult.token;

    const { finalist_id } = (await request.json()) as { finalist_id?: string };
    if (!finalist_id) {
      return NextResponse.json({ error: "Missing finalist_id" }, { status: 400 });
    }

    const votingEnabledResult = await getVotingEnabled(token);
    if ("error" in votingEnabledResult) {
      return toErrorResponse(votingEnabledResult);
    }
    if (!votingEnabledResult.enabled) {
      return NextResponse.json({ error: "Voting is not enabled by admin." }, { status: 403 });
    }

    // Get the selected finalist's DB id, track, and round
    const finalistResult = await dataApiFetch<Array<{ id: number; track: string; round: string }>>(
      token,
      `finalists?uuid_id=eq.${encodeURIComponent(finalist_id)}&select=id,track,round&limit=1`,
    );
    if ("error" in finalistResult) {
      return toErrorResponse(finalistResult);
    }
    const finalist = finalistResult.data[0];
    if (!finalist) {
      return NextResponse.json({ error: "Invalid finalist_id" }, { status: 400 });
    }
    const voteRound = normalizeVoteRound(finalist.round);
    if (!voteRound) {
      return NextResponse.json({ error: `Invalid round value: ${finalist.round}` }, { status: 400 });
    }

    // Check if user already voted for this finalist
    const existingFinalistVoteResult = await dataApiFetch<Array<{ id: number }>>(
      token,
      `votes?user_id=eq.${encodeURIComponent(userId)}&finalist_id=eq.${finalist.id}&select=id&limit=1`,
    );
    if ("error" in existingFinalistVoteResult) {
      return toErrorResponse(existingFinalistVoteResult);
    }
    if (existingFinalistVoteResult.data.length > 0) {
      return NextResponse.json({ error: "You already voted for this finalist." }, { status: 409 });
    }

    // Check if user already voted in this category (track + round)
    const finalistsInCategoryResult = await dataApiFetch<Array<{ id: number }>>(
      token,
      `finalists?track=eq.${encodeURIComponent(finalist.track)}&round=eq.${encodeURIComponent(finalist.round)}&select=id`,
    );
    if ("error" in finalistsInCategoryResult) {
      return toErrorResponse(finalistsInCategoryResult);
    }
    const finalistIds = finalistsInCategoryResult.data.map((item) => item.id);
    if (finalistIds.length === 0) {
      return NextResponse.json({ error: "No finalists found for this category." }, { status: 400 });
    }

    const existingCategoryVoteResult = await dataApiFetch<Array<{ id: number }>>(
      token,
      `votes?user_id=eq.${encodeURIComponent(userId)}&finalist_id=in.(${finalistIds.join(",")})&select=id&limit=1`,
    );
    if ("error" in existingCategoryVoteResult) {
      return toErrorResponse(existingCategoryVoteResult);
    }
    if (existingCategoryVoteResult.data.length > 0) {
      return NextResponse.json({ error: "You can only vote once in each competition." }, { status: 409 });
    }

    // Insert the vote
    const insertResult = await dataApiFetch<unknown>(token, "votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        finalist_id: finalist.id,
        round: voteRound,
      }),
    });
    if ("error" in insertResult) {
      if (isDuplicateVote(insertResult.details)) {
        return NextResponse.json({ error: "You already voted for this finalist." }, { status: 409 });
      }
      return toErrorResponse(insertResult);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to submit vote", details: String(err) },
      { status: 500 },
    );
  }
}
