"use client";

import { useMemo, useState, useEffect } from "react";
import { Vote } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BottomNavBar } from "@/components/bottom-navbar";
import { ProfilePanel } from "@/components/profile-panel";
import { authClient } from "@/lib/auth-client";
import { api, type VotingStatus, type Finalist as ApiFinalist } from "@/lib/api";

type Track = "Eastern" | "Western";
type Round = "Duet" | "Solo";
type Category = "duet_eastern" | "duet_western" | "solo_eastern" | "solo_western";

const CATEGORY_ORDER: Category[] = [
  "duet_eastern",
  "duet_western",
  "solo_eastern",
  "solo_western",
];

const CATEGORY_LABELS: Record<Category, string> = {
  duet_eastern: "Eastern Duet",
  duet_western: "Western Duet",
  solo_eastern: "Eastern Solo",
  solo_western: "Western Solo",
};

type Finalist = {
  id: string;
  name: string;
  semester: string;
  department: string;
  track: Track;
  round: Round;
  avatar: string;
};

type ScheduleSlot = {
  time: string;
  track: Track;
  round: Round;
  venue: string;
};

function parseCategory(category: Category): { round: Round; track: Track } {
  const [roundRaw, trackRaw] = category.split("_");
  return {
    round: roundRaw === "duet" ? "Duet" : "Solo",
    track: trackRaw === "eastern" ? "Eastern" : "Western",
  };
}

export function VotingBoard() {
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const { data: sessionData } = authClient.useSession();
  const isLoggedIn = Boolean(sessionData?.user);

  const [tab, setTab] = useState<"home" | "schedule" | "profile">("home");
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [loadingVotes, setLoadingVotes] = useState<boolean>(true);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [castingVote, setCastingVote] = useState<boolean>(false);
  const [castVoteError, setCastVoteError] = useState<string | null>(null);
  const [votingStatus, setVotingStatus] = useState<VotingStatus | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    authClient.initialize();
  }, []);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const data = await api.schedule.get();
        setSchedule(data.schedule);
      } catch {
        // Handle error
      }
    }
    fetchSchedule();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsAdmin(false);
      return;
    }

    async function fetchAdminStatus() {
      try {
        const data = await api.admin.getStatus();
        setIsAdmin(Boolean(data.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    }
    fetchAdminStatus();
  }, [isLoggedIn, sessionData?.user?.id, sessionData?.user?.email]);

  useEffect(() => {
    async function fetchFinalists() {
      try {
        const data = await api.finalists.getAll();
        setFinalists(
          data.finalists.map((f: ApiFinalist) => ({
            id: f.uuid_id,
            name: f.name,
            semester: f.semester,
            department: f.department,
            track: f.track,
            round: f.round,
            avatar: f.avatar_url || "/euphony.png",
          }))
        );
      } catch {
        // Handle error
      }
    }
    fetchFinalists();
  }, []);

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
        const data = await api.votes.getCounts();
        setVotes(data.counts);
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
      setVotingStatus(null);
      setActiveCategory(null);
      setStatusError(null);
      return;
    }

    async function fetchVotingStatus() {
      setStatusError(null);
      try {
        const data = await api.votes.getStatus();
        setVotingStatus(data);
        
        const enabledCategory = CATEGORY_ORDER.find(
          (cat) => data[`voting_${cat}` as keyof VotingStatus] === true
        ) as Category | undefined;
        setActiveCategory(enabledCategory || null);
      } catch (err: unknown) {
        setStatusError(err instanceof Error ? err.message : "Error fetching voting status");
      }
    }

    fetchVotingStatus();
    const interval = setInterval(fetchVotingStatus, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!activeCategory || !isLoggedIn) {
      setHasVoted(false);
      return;
    }

    async function checkVoted() {
      try {
        const category = activeCategory;
        if (!category) {
          setHasVoted(false);
          return;
        }
        const { track, round } = parseCategory(category);
        const data = await api.votes.check(track, round);
        setHasVoted(data.hasVoted);
      } catch {
        setHasVoted(false);
      }
    }
    checkVoted();
  }, [activeCategory, isLoggedIn]);

  const finalistCounts = useMemo(() => {
    const eastern = finalists.filter((item) => item.track === "Eastern").length;
    const western = finalists.filter((item) => item.track === "Western").length;
    return { total: finalists.length, eastern, western };
  }, [finalists]);

  const voteNow = (finalist: Finalist) => {
    async function submitVote() {
      if (!activeCategory) return;
      
      setCastVoteError(null);
      setCastingVote(true);
      try {
        await api.votes.submit(finalist.id, activeCategory);
        setVotes((prev) => ({ ...prev, [finalist.id]: (prev[finalist.id] ?? 0) + 1 }));
        setHasVoted(true);
        setShowVoteModal(true);
      } catch (err: unknown) {
        setCastVoteError(err instanceof Error ? err.message : "Failed to cast vote");
      } finally {
        setCastingVote(false);
      }
    }

    if (!activeCategory) return;
    if (!isLoggedIn) {
      authClient.signIn.social({ provider: "google" });
      return;
    }
    void submitVote();
  };

  const filteredFinalists = useMemo(() => {
    if (!activeCategory) return [];
    const { round, track } = parseCategory(activeCategory);
    return finalists.filter((f) => f.round === round && f.track === track);
  }, [finalists, activeCategory]);

  return (
    <>
      {showVoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="neo-panel neo-shadow p-8 bg-zinc-900 text-center rounded-lg">
            <h2 className="neo-title text-2xl mb-2">Thank you for voting!</h2>
            <p className="mb-4">
              You have cast your vote for {activeCategory ? CATEGORY_LABELS[activeCategory] : "this category"}.<br />
              Please wait for the next category to be revealed.
            </p>
            <Button
              onClick={() => setShowVoteModal(false)}
              className="mt-2 border-2 border-zinc-100 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
            >
              OK
            </Button>
          </div>
        </div>
      )}
      <div className="min-h-screen overflow-x-clip bg-burst pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto w-full max-w-2xl px-2 py-4 md:py-10">
          <header className="neo-panel neo-shadow-lg p-4 md:p-8 bg-zinc-900 mb-2 sm:-rotate-1 md:mb-6">
            <div className="flex gap-2 justify-around md:gap-6 md:flex-row md:items-center md:justify-between">
              <Image src="/cetunes.png" alt="Euphony" width={60} height={60} className="object-contain" />
              <Image src="/euphony.png" alt="Euphony" width={60} height={60} className="object-contain" />
              <Image src="/Cetalks logo.png" alt="CETALKS" width={60} height={60} className="object-contain" />
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

          {tab === "home" && (
            <>
              <section className="mt-2 grid gap-4">
                <div className="neo-panel neo-shadow p-4 bg-zinc-900">
                  <h2 className="neo-title text-2xl">Vote Now</h2>
                  {!isLoggedIn && (
                    <div className="mt-3 rounded-md border-2 border-cyan-300 bg-zinc-800 p-3">
                      <p className="text-sm text-cyan-200">Sign up to unlock voting for this round.</p>
                      <Button
                        onClick={() => authClient.signIn.social({ provider: "google" })}
                        className="mt-2 border-2 border-cyan-300 bg-zinc-900 text-cyan-300 hover:bg-zinc-800"
                        size="sm"
                      >
                        Sign up with Google
                      </Button>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs font-semibold">
                    <span>Current Category:</span>
                    <span className="text-orange-300">
                      {activeCategory ? CATEGORY_LABELS[activeCategory] : "None active"}
                    </span>
                    <span>Voting:</span>
                    {statusError ? (
                      <span className="text-red-400">Unavailable</span>
                    ) : !activeCategory ? (
                      <span className="text-zinc-300">Waiting...</span>
                    ) : (
                      <span className="text-green-300">LIVE</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-semibold">
                    Total finalists: {finalistCounts.total} (Eastern: {finalistCounts.eastern}, Western: {finalistCounts.western})
                  </div>
                  {castVoteError && <div className="mt-2 text-xs text-red-400">{castVoteError}</div>}
                </div>

                <div className="neo-panel neo-shadow p-3 bg-zinc-900">
                  <h2 className="neo-title text-xl mb-2">
                    {activeCategory ? CATEGORY_LABELS[activeCategory] : "Finalists"}
                  </h2>
                  {!isLoggedIn ? (
                    <div className="text-center text-lg text-cyan-300 py-8">
                      Sign up to vote in this category.
                    </div>
                  ) : !activeCategory ? (
                    <div className="text-center text-lg text-orange-300 py-8">
                      Waiting for admin to enable voting...
                    </div>
                  ) : hasVoted ? (
                    <div className="text-center text-lg text-green-300 py-8">
                      You have already voted. Please wait for the next voting session.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredFinalists.map((finalist, index) => (
                        <article
                          key={finalist.id}
                          className={`neo-panel neo-shadow p-2 bg-zinc-900 ${
                            index % 2 === 0 ? "sm:-rotate-1" : "sm:rotate-1"
                          }`}
                        >
                          <div className="relative w-full overflow-hidden rounded-md border-2 border-black aspect-4/3 sm:aspect-16/10">
                            <Image
                              src={finalist.avatar}
                              alt={finalist.name}
                              fill
                              sizes="(max-width: 640px) 100vw, 50vw"
                              className="object-cover object-top"
                            />
                          </div>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em]">
                            {finalist.track} - {finalist.round}
                          </p>
                          <h3 className="neo-title text-lg mt-1">{finalist.name}</h3>
                          <p className="text-xs">{finalist.semester} - {finalist.department}</p>

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
                            onClick={() => voteNow(finalist)}
                            disabled={castingVote}
                            className="mt-2 w-full border-2 border-zinc-100 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                            size="sm"
                          >
                            <Vote className="w-4 h-4 mr-2" />
                            {castingVote ? "Submitting..." : "Cast Vote"}
                          </Button>
                        </article>
                      ))}
                    </div>
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

          <footer className="mt-8 mb-24 md:mb-0 neo-panel p-3 bg-zinc-900 flex flex-col items-center gap-2">
            <Image src="/euphony.png" alt="Euphony" width={50} height={50} className="object-contain" />
            <p className="text-xs font-semibold">Euphony Finals 2026</p>
          </footer>
        </div>
        <BottomNavBar active={tab} onChange={setTab} />
      </div>
    </>
  );
}

export default VotingBoard;
