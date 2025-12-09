"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [rol, setRol] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isIngelogd = localStorage.getItem("ingelogd");
    const opgeslagenRol = localStorage.getItem("rol");

    if (!isIngelogd) {
      router.push("/login");
    } else {
      setRol(opgeslagenRol);
      setIsCheckingAuth(false);
    }
  }, [router]);

  if (isCheckingAuth) {
    // Optioneel: simpeler "loading" scherm tijdens auth-check
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Bezig met controleren...</p>
      </main>
    );
  }

  function uitloggen() {
    localStorage.removeItem("ingelogd");
    localStorage.removeItem("rol");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <img
        src="/logo.png"
        alt="TDA Logo"
        className="w-52 mb-6"
      />

      <h1 className="text-3xl font-bold text-pink-500 mb-2">
        TDA Dansschool
      </h1>

      <p className="text-gray-300 mb-6">
        Beheeromgeving voor leden en lesgroepen
      </p>

      {rol && (
        <p className="mb-4 text-sm text-gray-400">
          Ingelogd als:{" "}
          <span className="text-pink-400 font-semibold">{rol}</span>
        </p>
      )}

      <div className="flex gap-4 mb-6">
        <Link
          href="/leden"
          className="bg-pink-500 text-black font-semibold px-6 py-3 rounded-full"
        >
          Leden
        </Link>

        <Link
          href="/lessen"
          className="border border-pink-500 text-pink-500 font-semibold px-6 py-3 rounded-full"
        >
          Lesgroepen
        </Link>
      </div>

      <button
        onClick={uitloggen}
        className="text-gray-400 underline text-sm"
      >
        Uitloggen
      </button>
    </main>
  );
}
