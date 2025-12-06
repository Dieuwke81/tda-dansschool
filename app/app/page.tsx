import Link from "next/link";

export default function Home() {
  return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                    <h1 className="text-3xl font-bold text-pink-500 mb-2">
                              Dansschool Administratie
                                      </h1>

                                              <p className="text-gray-300 mb-6">
                                                        Kies wat je wilt doen:
                                                                </p>

                                                                        <div className="flex flex-col gap-4">
                                                                                  <Link
                                                                                              href="/leden"
                                                                                                          className="block w-full text-center bg-pink-500 hover:bg-pink-600 rounded-xl py-3 text-lg font-semibold"
                                                                                                                    >
                                                                                                                                Leden bekijken
                                                                                                                                          </Link>

                                                                                                                                                    <Link
                                                                                                                                                                href="/lessen"
                                                                                                                                                                            className="block w-full text-center bg-pink-500 hover:bg-pink-600 rounded-xl py-3 text-lg font-semibold"
                                                                                                                                                                                      >
                                                                                                                                                                                                  Lesgroepen
                                                                                                                                                                                                            </Link>
                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                              </main>
                                                                                                                                                                                                                                );
                                                                                                                                                                                                                                }