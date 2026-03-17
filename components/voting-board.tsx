"use client";

import { useMemo, useState, useEffect } from "react";
import { Guitar, Mic2, Vote } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BottomNavBar } from "@/components/bottom-navbar";
import { ProfilePanel } from "@/components/profile-panel";
import { authClient } from "@/lib/auth/client";


type Track = "Eastern" | "Western";
type Round = "Solo" | "Duet";

type ScheduleSlot = {
  time: string;
  track: Track;
  round: Round;
  venue: string;
};

type Finalist = {
  id: string;
  name: string;
  stageName: string;
  track: Track;
  round: Round;
  city: string;
  avatar: string;
};

type FinalistsApiResponse = {
  finalists: Array<{
    uuid_id: string;
    name: string;
    stage_name: string;
    track: Track;
    round: Round;
    city: string;
    avatar_url: string;
  }>;
  duets: Array<{
    duet_name: string;
    member1_id: string;
    member2_id: string;
  }>;
};
export function VotingBoard() {
  const [showVoteModal, setShowVoteModal] = useState(false);
  // Removed votedCategory, setVotedCategory, hasVotedInCategory, setHasVotedInCategory
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const { data: sessionData } = authClient.useSession();
  const isLoggedIn = Boolean(sessionData?.user);

  // Fetch schedule from API
  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/schedule");
        if (!res.ok) throw new Error("Failed to fetch schedule");
        const data = await res.json();
        setSchedule(data.schedule);
      } catch {
        // Optionally handle error
      }
    }
    fetchSchedule();
  }, []);

  // Fetch admin status whenever auth identity changes
  useEffect(() => {
    if (!isLoggedIn) {
      setIsAdmin(false);
      return;
    }

    async function fetchAdminStatus() {
      try {
        const res = await fetch("/api/admin/status", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch admin status");
        const data = await res.json();
        setIsAdmin(Boolean(data.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    }
    fetchAdminStatus();
  }, [isLoggedIn, sessionData?.user?.id, sessionData?.user?.email]);
  const [tab, setTab] = useState<"home" | "schedule" | "profile">("home");
  // Removed trackFilter and roundFilter
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [loadingVotes, setLoadingVotes] = useState<boolean>(true);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [castingVote, setCastingVote] = useState<boolean>(false);
  const [castVoteError, setCastVoteError] = useState<string | null>(null);
  const [votingEnabled, setVotingEnabled] = useState<boolean | null>(null);
  const [activeCategory, setActiveCategory] = useState<{ track: Track; round: Round } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [finalists, setFinalists] = useState<Finalist[]>([]);

  // Fetch finalists and duets from API
  useEffect(() => {
    async function fetchFinalists() {
      try {
        const res = await fetch("/api/finalists");
        if (!res.ok) throw new Error("Failed to fetch finalists");
        const data: FinalistsApiResponse = await res.json();
        // Map DB rows to Finalist type
        setFinalists(
          data.finalists.map((f) => ({
            id: f.uuid_id,
            name: f.name,
            stageName: f.stage_name,
            track: f.track,
            round: f.round,
            city: f.city,
            avatar: f.avatar_url,
          }))
        );
      } catch {
        // Optionally handle error
      }
    }
    fetchFinalists();
  }, []);

  // Fetch live vote counts from API
  useEffect(() => {
    if (!isLoggedIn) {
      setVotes({});
      setVoteError(null);
      setLoadingVotes(false);
      return;
    }

    async function fetchVotes() {
      setLoadingVotes(true);
      setVoteError(null);
      try {
        const res = await fetch("/api/votes");
        if (!res.ok) throw new Error("Failed to fetch votes");
        const data = await res.json();
        setVotes(data);
      } catch (err: unknown) {
        setVoteError(err instanceof Error ? err.message : "Error fetching votes");
      } finally {
        setLoadingVotes(false);
      }
    }
    fetchVotes();
    const interval = setInterval(fetchVotes, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setVotingEnabled(null);
      setActiveCategory(null);
      setStatusError(null);
      return;
    }

    async function fetchVotingStatus() {
      setStatusError(null);
      try {
        const res = await fetch("/api/votes/status", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch voting status");
        const data = (await res.json()) as Record<string, boolean>;
        setVotingEnabled(Boolean(data.voting_enabled));
        // Find the first enabled category
        const category = [
          { key: "voting_eastern_solo", track: "Eastern", round: "Solo" },
          { key: "voting_eastern_duet", track: "Eastern", round: "Duet" },
          { key: "voting_western_solo", track: "Western", round: "Solo" },
          { key: "voting_western_duet", track: "Western", round: "Duet" },
        ].find(({ key }) => data[key]);
        if (category) {
          setActiveCategory({ track: category.track as Track, round: category.round as Round });
        } else {
          setActiveCategory(null);
        }
      } catch (err: unknown) {
        setStatusError(err instanceof Error ? err.message : "Error fetching voting status");
      }
    }

    fetchVotingStatus();
    const interval = setInterval(fetchVotingStatus, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Removed filteredFinalists logic

  const finalistCounts = useMemo(() => {
    const eastern = finalists.filter((item) => item.track === "Eastern").length;
    const western = finalists.filter((item) => item.track === "Western").length;
    return {
      total: finalists.length,
      eastern,
      western,
    };
  }, [finalists]);

  const voteNow = (id: string) => {
    async function submitVote() {
      setCastVoteError(null);
      setCastingVote(true);
      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finalist_id: id }),
          credentials: "include",
        });

        if (!res.ok) {
          let reason = `Failed to cast vote (${res.status})`;
          try {
            const body = (await res.json()) as { error?: string; details?: string };
            if (body.error) {
              // Custom message for duplicate vote
              if (body.error.includes("already voted")) {
                reason = "You can only vote once in each competition.";
              } else {
                reason = body.error;
              }
            }
            if (body.details) {
              reason = `${reason}: ${body.details}`;
            }
          } catch {
            const raw = await res.text();
            if (raw) {
              reason = `${reason}: ${raw}`;
            }
          }
          throw new Error(reason);
        }

        setVotes((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));

        // Find the voted finalist's track and round
        const votedFinalist = finalists.find(f => f.id === id);
        if (votedFinalist) {
          // setVotedCategory removed
        }
        setShowVoteModal(true);
      } catch (err: unknown) {
        setCastVoteError(err instanceof Error ? err.message : "Failed to cast vote");
      } finally {
        setCastingVote(false);
      }
    }

    if (votingEnabled === false) {
      return;
    }
    if (!isLoggedIn) {
      authClient.signIn.social({ provider: "google", callbackURL: "/" });
      return;
    }
    void submitVote();
  };


  // New logic: check if user has already voted (global)
  const [hasVoted, setHasVoted] = useState(false);
  useEffect(() => {
    if (votingEnabled && isLoggedIn && activeCategory?.round) {
      const checkVoted = async () => {
        try {
          const res = await fetch(
            `/api/votes/check?track=${encodeURIComponent(activeCategory.track)}&round=${encodeURIComponent(activeCategory.round)}`,
            { credentials: "include" },
          );
          if (!res.ok) return;
          const data = await res.json();
          setHasVoted(Boolean(data.hasVoted));
        } catch {}
      };
      checkVoted();
    } else {
      setHasVoted(false);
    }
  }, [votingEnabled, isLoggedIn, activeCategory]);

  return (
    <>
      {showVoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="neo-panel neo-shadow p-8 bg-zinc-900 text-center rounded-lg">
            <h2 className="neo-title text-2xl mb-2">Thank you for voting!</h2>
            <p className="mb-4">You have cast your vote for this category.<br />Please wait for the next category to be revealed.</p>
            <Button onClick={() => setShowVoteModal(false)} className="mt-2 border-2 border-zinc-100 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">OK</Button>
          </div>
        </div>
      )}
      <div className="min-h-screen overflow-x-clip bg-burst pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto w-full max-w-2xl px-2 py-4 md:py-10">
          {/* Header always visible */}
          <header className="neo-panel neo-shadow-lg p-4 md:p-8 bg-zinc-900 mb-2 sm:-rotate-1 md:mb-6">
            <div className="flex flex-col gap-2 md:gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase">Grand Finale</p>
                <h1 className="neo-title text-3xl md:text-5xl leading-none mt-1">Euphony Voting Arena</h1>
              </div>
              <div className="hidden md:flex md:items-center md:gap-2">
                <Button
                  onClick={() => setTab("home")}
                  className={
                    tab === "home"
                      ? "border-2 border-orange-300 bg-zinc-900 text-orange-300"
                      : "border-2 border-zinc-200 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                  }
                >
                  Vote
                </Button>
                <Button
                  onClick={() => setTab("schedule")}
                  className={
                    tab === "schedule"
                      ? "border-2 border-cyan-300 bg-zinc-900 text-cyan-300"
                      : "border-2 border-zinc-200 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                  }
                >
                  Schedule
                </Button>
                <Button
                  onClick={() => setTab("profile")}
                  className={
                    tab === "profile"
                      ? "border-2 border-lime-300 bg-zinc-900 text-lime-300"
                      : "border-2 border-zinc-200 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                  }
                >
                  Profile
                </Button>
              </div>
            </div>
          </header>

          {/* Tab content */}
          {tab === "home" && (
            <>
              <section className="mt-2 grid gap-4">
                <div className="neo-panel neo-shadow p-4 bg-zinc-900">
                  <h2 className="neo-title text-2xl">Vote Now</h2>
                  {!isLoggedIn && (
                    <div className="mt-3 rounded-md border-2 border-cyan-300 bg-zinc-800 p-3">
                      <p className="text-sm text-cyan-200">Sign up to unlock voting for this round.</p>
                      <Button
                        onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
                        className="mt-2 border-2 border-cyan-300 bg-zinc-900 text-cyan-300 hover:bg-zinc-800"
                        size="sm"
                      >
                        Sign up with Google
                      </Button>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
                    <span>Voting Status:</span>
                    {statusError ? (
                      <span className="text-red-400">Unavailable</span>
                    ) : votingEnabled === null ? (
                      <span className="text-zinc-300">Checking...</span>
                    ) : votingEnabled ? (
                      <span className="text-green-300">ENABLED</span>
                    ) : (
                      <span className="text-red-300">DISABLED</span>
                    )}
                  </div>
                  {/* Filter buttons removed */}
                  <div className="mt-2 text-xs font-semibold">
                    Total finalists: {finalistCounts.total} (Eastern: {finalistCounts.eastern},
                    {" "}Western: {finalistCounts.western})
                  </div>
                  {castVoteError && <div className="mt-2 text-xs text-red-400">{castVoteError}</div>}
                </div>

                <div className="neo-panel neo-shadow p-3 bg-zinc-900">
                  <h2 className="neo-title text-xl mb-2">Finalists</h2>
                  {!isLoggedIn ? (
                    <div className="text-center text-lg text-cyan-300 py-8">Sign up to vote in this category.</div>
                  ) : votingEnabled ? (
                    hasVoted ? (
                      <div className="text-center text-lg text-green-300 py-8">You have already voted. Please wait for the next voting session to be enabled.</div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {finalists
                          .filter(f =>
                            activeCategory
                              ? f.track === activeCategory.track && f.round === activeCategory.round
                              : true
                          )
                          .map((finalist, index) => (
                          <article
                            key={finalist.id}
                            className={`neo-panel neo-shadow p-2 bg-zinc-900 ${
                              index % 2 === 0 ? "sm:-rotate-1" : "sm:rotate-1"
                            }`}
                          >
                            <div className="relative w-full overflow-hidden rounded-md border-2 border-black aspect-[4/3] sm:aspect-[16/10]">
                              <Image
                                src={finalist.avatar}
                                alt={finalist.stageName}
                                fill
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover object-top"
                              />
                            </div>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em]">
                              {finalist.track} • {finalist.round}
                            </p>
                            <h3 className="neo-title text-lg mt-1">{finalist.stageName}</h3>
                            <p className="text-xs">{finalist.name}</p>
                            <p className="text-xs text-zinc-300">{finalist.city}</p>

                            {isAdmin && (
                              <div className="mt-2 flex items-center justify-between rounded-md border-2 border-yellow-300 bg-zinc-800 px-2 py-1">
                                <span className="font-bold text-xs text-yellow-200">Votes</span>
                                {loadingVotes ? (
                                  <span className="neo-title text-lg text-yellow-200 animate-pulse">...</span>
                                ) : voteError ? (
                                  <span className="text-xs text-red-400">Err</span>
                                ) : (
                                  <span className="neo-title text-lg text-yellow-200">{votes[finalist.id] ?? 0}</span>
                                )}
                              </div>
                            )}

                            <Button
                              onClick={() => voteNow(finalist.id)}
                              disabled={!votingEnabled || castingVote}
                              className="mt-2 w-full border-2 border-zinc-100 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                              size="sm"
                            >
                              <Vote className="w-4 h-4 mr-2" />
                              {castingVote
                                ? "Submitting..."
                                : !votingEnabled
                                ? "Voting Disabled"
                                : isLoggedIn
                                  ? "Cast Vote"
                                  : "Sign up to Vote"}
                            </Button>
                          </article>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="text-center text-lg text-orange-300 py-8">This category is not enabled yet. Please wait for the admin to enable voting.</div>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === "schedule" && (
            <section className="mt-2">
              <div className="neo-panel neo-shadow p-4 bg-zinc-900">
                <h2 className="neo-title text-2xl mb-2">Event Schedule</h2>
                <div className="space-y-3">
                  {schedule.map((slot) => (
                    <div
                      key={`${slot.time}-${slot.track}-${slot.round}`}
                      className="rounded-md border-2 border-zinc-200 bg-zinc-800 px-3 py-2 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                    >
                      <p className="font-semibold text-sm">{slot.time}</p>
                      <p className="font-bold">{slot.track}</p>
                      <p className="text-sm">{slot.round}</p>
                      <p className="text-xs">{slot.venue}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab === "profile" && <ProfilePanel />}

          <footer className="mt-8 mb-24 md:mb-0 neo-panel p-3 bg-zinc-900 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-semibold">Built for mobile and desktop voting audiences.</p>
            <div className="flex items-center gap-2 text-xs font-bold">
              <Mic2 className="w-4 h-4" />
              <Guitar className="w-4 h-4" />
              <span>CETALKS X CETUNES</span>
            </div>
          </footer>
        </div>
        <BottomNavBar active={tab} onChange={setTab} />
      </div>
    </>
  );
}

export default VotingBoard;
