import { getAuth } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

type VoteRound = "solo" | "dut";
type VoteTrack = "eastern" | "western";

function normalizeVoteRound(input: string): VoteRound | null {
  const value = input.trim().toLowerCase();
  if (value === "solo") return "solo";
  if (value === "duet" || value === "dut") return "dut";
  return null;
}

function normalizeVoteTrack(input: string): VoteTrack | null {
  const value = input.trim().toLowerCase();
  if (value === "eastern") return "eastern";
  if (value === "western") return "western";
  return null;
}

export async function GET(req: Request) {
  const auth = getAuth();
  const session = await auth.getSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ hasVoted: false });
  }
  const { searchParams } = new URL(req.url);
  const trackParam = searchParams.get("track");
  const roundParam = searchParams.get("round");
  if (!trackParam || !roundParam) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }
  const track = normalizeVoteTrack(trackParam);
  const round = normalizeVoteRound(roundParam);
  if (!track || !round) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const userId = session.user.id || session.user.email;
  const sql = neon(process.env["NEON_DATABASE_URL"]!);
  const result = await sql(
    `SELECT 1
     FROM votes v
     JOIN finalists f ON f.id = v.finalist_id
     WHERE v.user_id = $1
       AND lower(f.track) = $2
       AND lower(f.round) = $3
     LIMIT 1`,
    [userId, track, round === "dut" ? "duet" : "solo"]
  );
  return NextResponse.json({ hasVoted: result.length > 0 });
}
