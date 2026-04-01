"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { VotingBoard } from "@/components/voting-board";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);

  if (!showWelcome) {
    return <VotingBoard />;
  }

  return (
    <main className="min-h-screen bg-burst px-4 py-8 flex items-center justify-center">
      <section className="neo-panel neo-shadow-lg w-full max-w-md bg-black p-6 md:p-10 text-center">
        <Image src="/euphony.png" alt="Euphony" width={200} height={200} className="mx-auto object-contain" />
        <p className="mt-4 text-zinc-300 text-sm">
          CETALKS X CETUNES<br />Cast your vote for your favorites
        </p>
        <Button
          onClick={() => setShowWelcome(false)}
          className="mt-8 border-2 border-orange-300 bg-zinc-900 text-orange-300 hover:bg-zinc-800"
        >
          Enter
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </section>
    </main>
  );
}
