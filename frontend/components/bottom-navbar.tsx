"use client";
import { Home, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "home" | "schedule" | "profile";

export function BottomNavBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-zinc-100 bg-zinc-950/95 backdrop-blur flex justify-around items-center min-h-16 px-1 pb-[env(safe-area-inset-bottom)] md:hidden neo-shadow">
      <button
        className={cn(
          "flex flex-col items-center justify-center flex-1 min-h-14 py-2",
          active === "home" ? "text-orange-400 font-bold" : "text-zinc-400"
        )}
        onClick={() => onChange("home")}
        aria-label="Home"
        aria-current={active === "home" ? "page" : undefined}
        type="button"
      >
        <Home className="w-6 h-6 mb-1" />
        <span className="text-xs">Vote</span>
      </button>
      <button
        className={cn(
          "flex flex-col items-center justify-center flex-1 min-h-14 py-2",
          active === "schedule" ? "text-cyan-300 font-bold" : "text-zinc-400"
        )}
        onClick={() => onChange("schedule")}
        aria-label="Schedule"
        aria-current={active === "schedule" ? "page" : undefined}
        type="button"
      >
        <Calendar className="w-6 h-6 mb-1" />
        <span className="text-xs">Schedule</span>
      </button>
      <button
        className={cn(
          "flex flex-col items-center justify-center flex-1 min-h-14 py-2",
          active === "profile" ? "text-lime-300 font-bold" : "text-zinc-400"
        )}
        onClick={() => onChange("profile")}
        aria-label="Profile"
        aria-current={active === "profile" ? "page" : undefined}
        type="button"
      >
        <User className="w-6 h-6 mb-1" />
        <span className="text-xs">Profile</span>
      </button>
    </nav>
  );
}
