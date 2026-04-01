"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { api, type AdminResult, type VotingStatus } from "@/lib/api";

type CategoryKey = "duet_eastern" | "duet_western" | "solo_eastern" | "solo_western";

const CATEGORY_CONFIG: Array<{ key: CategoryKey; label: string }> = [
  { key: "duet_eastern", label: "Duet Eastern" },
  { key: "duet_western", label: "Duet Western" },
  { key: "solo_eastern", label: "Solo Eastern" },
  { key: "solo_western", label: "Solo Western" },
];

function AdminPanel() {
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [results, setResults] = useState<AdminResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<CategoryKey | null>(null);
  const [busyNext, setBusyNext] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusData, resultData] = await Promise.all([
        api.votes.getStatus(),
        api.admin.getResults(),
      ]);
      setStatus(statusData);
      setResults(resultData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const activeCategory = useMemo(() => {
    if (!status) return "None";
    const found = CATEGORY_CONFIG.find((c) => status[`voting_${c.key}` as keyof VotingStatus] === true);
    return found ? found.label : "None";
  }, [status]);

  const totalVotes = useMemo(() => {
    return results.reduce((sum, row) => sum + row.votes, 0);
  }, [results]);

  const toggleCategory = async (key: CategoryKey, enabled: boolean) => {
    setBusyKey(key);
    setError(null);
    setMessage(null);
    try {
      await api.admin.toggleCategory(key, enabled);
      setMessage(`${enabled ? "Enabled" : "Disabled"} ${key.replace("_", " ")}`);
      await loadAdminData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setBusyKey(null);
    }
  };

  const moveToNextCategory = async () => {
    setBusyNext(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.admin.nextCategory();
      setMessage(res.message);
      await loadAdminData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to advance category");
    } finally {
      setBusyNext(false);
    }
  };

  return (
    <div className="neo-panel neo-shadow p-6 bg-zinc-900 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="neo-title text-xl">Admin Controls</h3>
        <Button
          onClick={() => void loadAdminData()}
          className="border-2 border-zinc-100 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
          size="sm"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <div className="rounded-md border-2 border-cyan-300 bg-zinc-800 p-2">
          <p className="text-zinc-300">Active category</p>
          <p className="neo-title text-cyan-300">{activeCategory}</p>
        </div>
        <div className="rounded-md border-2 border-yellow-300 bg-zinc-800 p-2">
          <p className="text-zinc-300">Total votes cast</p>
          <p className="neo-title text-yellow-200">{totalVotes}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CATEGORY_CONFIG.map((item) => {
          const statusKey = `voting_${item.key}` as keyof VotingStatus;
          const enabled = Boolean(status?.[statusKey]);
          const isBusy = busyKey === item.key;
          return (
            <div key={item.key} className="rounded-md border-2 border-zinc-700 bg-zinc-800 p-3">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className={`text-xs ${enabled ? "text-green-300" : "text-zinc-400"}`}>
                {enabled ? "Enabled" : "Disabled"}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => void toggleCategory(item.key, true)}
                  className="border-2 border-green-300 bg-zinc-900 text-green-300 hover:bg-zinc-800"
                  size="sm"
                  disabled={isBusy}
                >
                  Enable
                </Button>
                <Button
                  onClick={() => void toggleCategory(item.key, false)}
                  className="border-2 border-red-300 bg-zinc-900 text-red-300 hover:bg-zinc-800"
                  size="sm"
                  disabled={isBusy}
                >
                  Disable
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <Button
          onClick={() => void moveToNextCategory()}
          className="border-2 border-orange-300 bg-zinc-900 text-orange-300 hover:bg-zinc-800"
          disabled={busyNext}
        >
          {busyNext ? "Switching..." : "Advance to Next Category"}
        </Button>
      </div>

      {message && <p className="mt-3 text-sm text-green-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5">
        <h4 className="neo-title text-lg">Vote Count by Finalist</h4>
        <div className="mt-2 max-h-72 overflow-auto rounded-md border-2 border-zinc-700">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-800 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Track</th>
                <th className="px-3 py-2 text-left">Round</th>
                <th className="px-3 py-2 text-right">Votes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.uuid_id} className="border-t border-zinc-700">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.track}</td>
                  <td className="px-3 py-2">{row.round}</td>
                  <td className="px-3 py-2 text-right neo-title text-yellow-200">{row.votes}</td>
                </tr>
              ))}
              {!results.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center text-zinc-400">
                    {loading ? "Loading..." : "No results available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ProfilePanel() {
  const { data: sessionData } = authClient.useSession();
  const user = sessionData?.user;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    async function loadStatus() {
      try {
        const res = await api.admin.getStatus();
        setIsAdmin(Boolean(res.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    }

    void loadStatus();
  }, [user?.id, user?.email]);

  if (user) {
    return (
      <div className="mt-8">
        <div className="neo-panel neo-shadow p-6 bg-zinc-900 flex flex-col items-center">
          <h2 className="neo-title text-2xl mb-1">Signed in</h2>
          <p className="text-sm text-zinc-300 mb-4">{user.email}</p>
          <Button
            onClick={() => authClient.signOut()}
            className="border-2 border-zinc-100 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
          >
            Sign out
          </Button>
        </div>
        {isAdmin && <AdminPanel />}
      </div>
    );
  }

  return (
    <div className="neo-panel neo-shadow p-6 bg-zinc-900 flex flex-col items-center mt-8">
      <h2 className="neo-title text-2xl mb-2">Sign in to vote</h2>
      <Button
        onClick={() => authClient.signIn.social({ provider: "google" })}
        className="border-2 border-cyan-300 bg-zinc-900 text-cyan-300 hover:bg-zinc-800"
      >
        Sign in with Google
      </Button>
    </div>
  );
}
