"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { AdminToggleVoting } from "@/components/admin-toggle-voting";
import { authClient } from "@/lib/auth/client";

export function ProfilePanel() {
  const { data: sessionData, isPending } = authClient.useSession();
  const user = sessionData?.user;
  const isLoggedIn = Boolean(user);
  if (user?.id) {
    // Log user id for admin setup
    console.log("Your user_id for admin setup:", user.id);
  }

  if (isPending) {
    return null;
  }

  if (!isLoggedIn)
    return (
      <div className="neo-panel neo-shadow p-6 bg-zinc-900 flex flex-col items-center mt-8">
        <User className="w-12 h-12 mb-2 text-zinc-400" />
        <h2 className="neo-title text-2xl mb-2">Not signed in</h2>
        <p className="mb-4 text-center text-zinc-300">Sign up with Google to vote and view your profile.</p>
        <Button
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
          className="border-2 border-cyan-300 bg-zinc-900 text-cyan-300 hover:bg-zinc-800"
        >
          Sign up with Google
        </Button>
      </div>
    );

  return (
    <div className="neo-panel neo-shadow p-6 bg-zinc-900 flex flex-col items-center mt-8">
      {user?.image && (
        <Image
          src={user.image}
          alt="User avatar"
          width={64}
          height={64}
          className="w-16 h-16 rounded-full border-2 border-black mb-2 object-cover"
        />
      )}
      <h2 className="neo-title text-2xl mb-1">{user?.name || "User"}</h2>
      <p className="text-sm text-zinc-300 mb-2">{user?.email}</p>
      <Button
        onClick={async () => {
          await authClient.signOut();
          window.location.href = "/login";
        }}
        className="mt-2 border-2 border-zinc-100 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
      >
        Sign out
      </Button>
      {/* Show admin controls if admin */}
      <div className="w-full mt-6">
        <AdminToggleVoting />
      </div>
    </div>
  );
}
