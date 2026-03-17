"use client";
import { AdminToggleVoting } from "@/components/admin-toggle-voting";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SettingsUI() {
  const { data: sessionData, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) return null;
  if (!sessionData?.user) {
    router.replace("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-burst flex items-center justify-center p-4">
      <section className="w-full max-w-xl">
        <h1 className="neo-title text-3xl mb-6">Admin Settings</h1>
        <AdminToggleVoting />
      </section>
    </main>
  );
}
