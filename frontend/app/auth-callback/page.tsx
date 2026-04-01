"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const user_id = searchParams.get("user_id");
    const email = searchParams.get("email");

    if (token && user_id && email) {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_id", user_id);
      localStorage.setItem("user_email", email);
      window.dispatchEvent(new Event("auth-change"));
      router.push("/");
    } else {
      const errorMsg = searchParams.get("error") || "Authentication failed";
      setError(errorMsg);
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-burst flex items-center justify-center">
        <div className="neo-panel neo-shadow p-8 bg-zinc-900 text-center">
          <h1 className="neo-title text-2xl text-red-400 mb-4">Error</h1>
          <p className="text-zinc-300 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="border-2 border-orange-300 px-4 py-2 text-orange-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-burst flex items-center justify-center">
      <div className="neo-panel neo-shadow p-8 bg-zinc-900 text-center">
        <p className="text-xl">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-burst flex items-center justify-center">
          <div className="neo-panel neo-shadow p-8 bg-zinc-900 text-center">
            <p className="text-xl">Signing you in...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
