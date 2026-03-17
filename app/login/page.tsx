"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-burst flex items-center justify-center px-4">
      <section className="neo-panel neo-shadow-lg max-w-xl w-full p-8 bg-zinc-900 rotate-[-0.7deg]">
        <p className="text-xs uppercase tracking-[0.3em] font-bold">Euphony Finals</p>
        <h1 className="neo-title text-5xl mt-2">Google Sign-up Required</h1>
        <p className="mt-4 text-lg text-zinc-300">
          Sign up with Google to vote and keep tally secure and fair.
        </p>
        <Button
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
          className="mt-6 h-12 px-6 text-base border-2 border-cyan-300 bg-zinc-900 text-cyan-300 hover:bg-zinc-800"
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          Sign up with Google
        </Button>
      </section>
    </main>
  );
}
