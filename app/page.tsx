"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

type SessionResponse = {
  loggedIn?: boolean;
  rol?: Rol;
  username?: string;
};

function isAndroidUA() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [rol, setRol] = useState<Rol | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Push states
  const [isAndroid, setIsAndroid] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string>("");

  useEffect(() => {
    setIsAndroid(isAndroidUA());
    setPushSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        typeof Notification !== "undefined"
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await res.json().catch(() => null)) as SessionResponse | null;

        if (!res.ok || !data?.loggedIn) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const r: Rol = (data?.rol ?? "gast") as Rol;

        if (r === "lid") {
          if (!cancelled) router.replace("/mijn");
          return;
        }

        if (!cancelled) {
          setRol(r);
          setIsCheckingAuth(false);
        }
      } catch {
        if (!cancelled) router.replace("/login");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Check current subscription (UI status)
  useEffect(() => {
    let cancelled = false;

    async function checkSub() {
      try {
        if (!pushSupported) return;
        if (rol !== "eigenaar") return;

        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          if (!cancelled) setPushEnabled(false);
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setPushEnabled(!!sub);
      } catch {
        if (!cancelled) setPushEnabled(false);
      }
    }

    checkSub();
    return () => {
      cancelled = true;
    };
  }, [rol, pushSupported]);

  async function uitloggen() {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch {}

    if (typeof window !== "undefined") {
      localStorage.removeItem("ingelogd");
      localStorage.removeItem("rol");
      localStorage.removeItem("tda_ingelogd");
    }

    router.replace("/login");
  }

  async function enablePush() {
    setPushMsg("");

    if (rol !== "eigenaar") {
      setPushMsg("Alleen de eigenaar kan notificaties aanzetten.");
      return;
    }
    if (!pushSupported) {
      setPushMsg("Push wordt niet ondersteund op dit apparaat / in deze browser.");
      return;
    }
    if (!isAndroid) {
      setPushMsg("Notificaties zijn nu alleen bedoeld voor Android.");
      return;
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    if (!vapidPublic) {
      setPushMsg("NEXT_PUBLIC_VAPID_PUBLIC_KEY ontbreekt (Vercel / env).");
      return;
    }

    setPushBusy(true);
    try {
      // 1) Register SW
      const reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));

      // 2) Permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMsg("Notificaties zijn niet toegestaan (permission geweigerd).");
        setPushEnabled(false);
        return;
      }

      // 3) Subscribe
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        }));

      // 4) Save on server
      const deviceLabel =
        (typeof navigator !== "undefined" ? navigator.userAgent : "android") || "android";

      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subscription: sub,
          device_label: deviceLabel,
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || j?.ok === false) {
        throw new Error(j?.error || "Opslaan van subscription mislukt");
      }

      setPushEnabled(true);
      setPushMsg("✅ Notificaties staan aan op dit toestel.");
    } catch (e: any) {
      setPushEnabled(false);
      setPushMsg(e?.message || "Er ging iets mis bij push activeren.");
    } finally {
      setPushBusy(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Bezig met controleren...</p>
      </main>
    );
  }

  const isAdmin = rol === "eigenaar" || rol === "docent";

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const baseCard =
    "relative overflow-hidden rounded-2xl border px-7 py-4 font-semibold transition-all duration-200 select-none";
  const activeGlow =
    "ring-1 ring-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_10px_40px_rgba(236,72,153,0.18)]";
  const inactiveGlow =
    "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.55)]";

  const ledenActive = isActive("/leden");
  const lessenActive = isActive("/lessen");
  const wijzigingenActive = isActive("/wijzigingen");

  const showPushBlock = rol === "eigenaar";
  const showWijzigingenLink = rol === "eigenaar"; // alleen eigenaar moet keuren

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      {/* subtiele achtergrond glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-24 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-56 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <img
        src="/logo.png"
        alt="TDA Logo"
        className="w-80 md:w-96 mb-8 drop-shadow-[0_14px_40px_rgba(0,0,0,0.70)]"
      />

      <h1 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
        Tati&apos;s Dance Agency
      </h1>

      {rol && (
        <p className="mt-4 text-sm text-gray-400">
          Ingelogd als <span className="text-pink-400 font-semibold">{rol}</span>
        </p>
      )}

      {isAdmin ? (
        <div className="mt-10 w-full max-w-md flex flex-col gap-3 mb-8">
          <Link
            href="/leden"
            aria-current={ledenActive ? "page" : undefined}
            className={[
              baseCard,
              "w-full bg-pink-500 text-black border-pink-400/50",
              ledenActive ? activeGlow : inactiveGlow,
              "hover:bg-pink-400 active:scale-[0.99]",
            ].join(" ")}
          >
            <span className="relative z-10">Leden</span>
          </Link>

          <Link
            href="/lessen"
            aria-current={lessenActive ? "page" : undefined}
            className={[
              baseCard,
              "w-full bg-zinc-950/40 text-white border-zinc-700",
              lessenActive ? activeGlow : inactiveGlow,
              "hover:border-pink-500/60 hover:bg-pink-500/10 active:scale-[0.99]",
            ].join(" ")}
          >
            <span className="relative z-10 text-pink-400">Financieel Overzicht</span>
          </Link>

          {showWijzigingenLink && (
            <Link
              href="/wijzigingen"
              aria-current={wijzigingenActive ? "page" : undefined}
              className={[
                baseCard,
                "w-full bg-zinc-950/40 text-white border-pink-500/60",
                wijzigingenActive ? activeGlow : inactiveGlow,
                "hover:bg-pink-500/10 hover:border-pink-400 active:scale-[0.99]",
              ].join(" ")}
            >
              <span className="relative z-10 text-pink-400">Wijzigingen</span>
            </Link>
          )}
        </div>
      ) : (
        <p className="text-gray-400 mt-8 mb-10 text-sm">
          Je hebt geen beheerrechten op deze startpagina.
        </p>
      )}

      {/* Push block (alleen eigenaar) */}
      {showPushBlock && (
        <div className="w-full max-w-md mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Notificaties</div>
                <div className="text-xs text-gray-400 mt-1">
                  Alleen voor Android. Je krijgt meldingen bij wijzigingsverzoeken.
                </div>
              </div>

              <div
                className={[
                  "text-xs px-2 py-1 rounded-full border",
                  pushEnabled
                    ? "border-pink-400/50 text-pink-300 bg-pink-500/10"
                    : "border-white/10 text-gray-300 bg-white/5",
                ].join(" ")}
              >
                {pushEnabled ? "AAN" : "UIT"}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={enablePush}
                disabled={pushBusy || pushEnabled}
                className={[
                  "w-full rounded-full px-5 py-3 font-semibold transition",
                  pushEnabled
                    ? "bg-zinc-800 text-gray-300 cursor-not-allowed"
                    : "bg-pink-500 text-black hover:bg-pink-400",
                ].join(" ")}
              >
                {pushBusy ? "Bezig…" : pushEnabled ? "Notificaties staan aan" : "Notificaties aanzetten"}
              </button>

              {!pushSupported && (
                <p className="text-xs text-amber-300">
                  Push wordt niet ondersteund op dit apparaat / in deze browser.
                </p>
              )}

              {pushSupported && !isAndroid && (
                <p className="text-xs text-gray-400">
                  Tip: op desktop werkt dit soms ook, maar jij wilde het alleen voor Android.
                </p>
              )}

              {!!pushMsg && <p className="text-xs text-gray-300">{pushMsg}</p>}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={uitloggen}
        className="text-gray-400 underline text-sm hover:text-gray-200 transition"
      >
        Uitloggen
      </button>
    </main>
  );
}
