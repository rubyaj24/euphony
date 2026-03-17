"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MASTER_KEY = "voting_enabled";
const VOTE_KEYS = [
  { key: "voting_eastern_solo", label: "Eastern Solo" },
  { key: "voting_eastern_duet", label: "Eastern Duet" },
  { key: "voting_western_solo", label: "Western Solo" },
  { key: "voting_western_duet", label: "Western Duet" },
];
const ALL_KEYS = [MASTER_KEY, ...VOTE_KEYS.map((item) => item.key)];

export function AdminToggleVoting() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAdminStatus() {
      try {
        const res = await fetch("/api/admin/status", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch admin status");
        const data = (await res.json()) as { isAdmin?: boolean };
        setIsAdmin(Boolean(data.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    }

    async function fetchStatus() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/votes/status", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = (await res.json()) as Record<string, boolean>;
        const normalized: Record<string, boolean> = {};
        for (const key of ALL_KEYS) {
          normalized[key] = Boolean(data[key]);
        }
        setStatus(normalized);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to fetch status");
      } finally {
        setLoading(false);
      }
    }

    fetchAdminStatus();
    fetchStatus();
  }, []);

  async function toggleVoting(key: string, newState: boolean) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/toggle-voting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: newState }),
        credentials: "include",
      });
      if (!res.ok) {
        let reason = `Request failed (${res.status})`;
        try {
          const body = (await res.json()) as { error?: string; details?: string };
          if (body.error) {
            reason = body.error;
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
      setStatus((prev) => ({ ...prev, [key]: newState }));
      setSuccess(`${key} updated`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update";
      console.error("Failed to toggle voting", { key, newState, error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (isAdmin !== true) return null;

  return (
    <div className="neo-panel neo-shadow p-4 bg-zinc-900 mt-4">
      <h2 className="neo-title text-xl mb-2">Admin Voting Control</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4 border-b border-zinc-700 pb-3">
          <span className="w-40 font-semibold">Voting Master</span>
          <span>
            {status[MASTER_KEY] === undefined
              ? "..."
              : status[MASTER_KEY]
                ? "ENABLED"
                : "DISABLED"}
          </span>
          <Button
            onClick={() => toggleVoting(MASTER_KEY, !Boolean(status[MASTER_KEY]))}
            disabled={loading}
            className={
              Boolean(status[MASTER_KEY])
                ? "border-2 border-red-400 bg-zinc-900 text-red-300"
                : "border-2 border-green-400 bg-zinc-900 text-green-300"
            }
          >
            {Boolean(status[MASTER_KEY]) ? "Disable" : "Enable"}
          </Button>
        </div>
        <div className="space-y-3">
        {VOTE_KEYS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4">
            <span className="w-40 font-semibold">{label}</span>
            <span>
              {status[key] === undefined ? "..." : status[key] ? "ENABLED" : "DISABLED"}
            </span>
            <Button
              onClick={() => toggleVoting(key, !Boolean(status[key]))}
              disabled={loading}
              className={
                Boolean(status[key])
                  ? "border-2 border-red-400 bg-zinc-900 text-red-300"
                  : "border-2 border-green-400 bg-zinc-900 text-green-300"
              }
            >
              {Boolean(status[key]) ? "Disable" : "Enable"}
            </Button>
          </div>
        ))}
        </div>
      </div>
      {error && <div className="text-red-400 mt-2">{error}</div>}
      {success && <div className="text-green-400 mt-2">{success}</div>}
    </div>
  );
}
