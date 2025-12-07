"use client";

import AuthGuard from "../auth-guard";

export default function LessenPage() {
  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white p-6">
        <h1 className="text-2xl font-bold text-pink-500 mb-2">Lesgroepen</h1>
        <p className="text-gray-300 mb-4">
          Hier komt straks het overzicht van alle lessen en docenten.
        </p>
      </main>
    </AuthGuard>
  );
}