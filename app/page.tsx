"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { VotingBoard } from "@/components/voting-board";
import { Button } from "@/components/ui/button";

const clubLogos = [
  { src: "/next.svg", alt: "Club 1", width: 160, height: 40 },
  { src: "/vercel.svg", alt: "Club 2", width: 160, height: 40 },
];

const sponsorLogos = [
  { src: "/file.svg", alt: "Sponsor 1", width: 28, height: 28 },
  { src: "/window.svg", alt: "Sponsor 2", width: 28, height: 28 },
  { src: "/globe.svg", alt: "Sponsor 3", width: 28, height: 28 },
];

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);

  if (!showWelcome) {
    return <VotingBoard />;
  }

  return (
    <main className="min-h-screen bg-burst px-4 py-8 flex items-center justify-center">
      <section className="neo-panel neo-shadow-lg w-full max-w-3xl bg-zinc-900 p-6 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Welcome</p>
        <h1 className="neo-title mt-2 text-4xl md:text-6xl leading-none">Euphony Voting Arena</h1>
        <p className="mt-4 text-zinc-300 max-w-xl">
          CETALKS X CETUNES.<br></br> Choose your category and cast your vote live.
        </p>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Clubs</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {clubLogos.map((logo) => (
            <div
              key={logo.src}
              className="neo-panel bg-zinc-800 px-4 py-5 flex min-h-20 items-center justify-center"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="opacity-90 invert"
              />
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-orange-300">Sponsors</p>
        <div className="mt-2 grid gap-3 grid-cols-3 sm:grid-cols-3">
          {sponsorLogos.map((logo) => (
            <div
              key={logo.src}
              className="neo-panel bg-zinc-800 px-4 py-4 flex min-h-16 items-center justify-center"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="opacity-90 invert"
              />
            </div>
          ))}
        </div>

        <Button
          onClick={() => setShowWelcome(false)}
          className="mt-8 border-2 border-orange-300 bg-zinc-900 text-orange-300 hover:bg-zinc-800"
        >
          Enter Voting Board
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </section>
    </main>
  );
}
