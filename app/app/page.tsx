export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="TDA Logo"
        className="w-40 mb-6"
      />

      {/* Titel */}
      <h1 className="text-3xl font-bold text-pink-500 mb-2">
        TDA Dansschool
      </h1>

      <p className="text-gray-300 mb-8">
        Beheeromgeving voor leden en lesgroepen
      </p>

      {/* Navigatie */}
      <div className="flex gap-4">
        <a
          href="/leden"
          className="bg-pink-500 text-black px-5 py-2 rounded font-semibold hover:bg-pink-600 transition"
        >
          Leden
        </a>

        <a
          href="/lessen"
          className="border border-pink-500 text-pink-500 px-5 py-2 rounded font-semibold hover:bg-pink-500 hover:text-black transition"
        >
          Lesgroepen
        </a>
      </div>
    </main>
  );
}