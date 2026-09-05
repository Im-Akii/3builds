"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_PLAYERS, newCode } from "../game/net/types";

export default function RoomsPage() {
  const router = useRouter();
  const [size, setSize] = useState(4);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const c = newCode();
    try {
      sessionStorage.setItem(`heist:host:${c}`, String(size));
    } catch {
      /* private mode: the room still works, just not across a refresh */
    }
    router.push(`/room/${c}`);
  };

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) {
      setError("That does not look like a room code.");
      return;
    }
    router.push(`/room/${c}`);
  };

  return (
    <main className="relative flex-1 overflow-y-auto bg-[#070b11] text-zinc-100">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-10 px-6 py-16">
        <div>
          <Link
            href="/"
            className="text-[11px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← back
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="mt-2 max-w-lg text-sm text-zinc-400">
            Create a room and send the link to your players. Roles are drawn
            when the countdown ends: one thief, everyone else a spectator posted
            to a single room.
          </p>
        </div>

        <section className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            New room
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                Players
              </span>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="rounded-md border border-white/20 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-white/40"
              >
                {Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => i + 2).map(
                  (n) => (
                    <option key={n} value={n}>
                      {n} players — 1 thief, {n - 1} spectator
                      {n - 1 > 1 ? "s" : ""}
                    </option>
                  ),
                )}
              </select>
            </label>
            <button
              onClick={create}
              className="rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
            >
              Create room
            </button>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            Three spectators covers every room: lobby, security, vault. Fewer
            players means some rooms go unwatched.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/40 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            Join with a code
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="ABCDE"
              maxLength={6}
              className="w-40 rounded-md border border-white/20 bg-zinc-950 px-3 py-2 font-mono text-sm tracking-[0.3em] outline-none focus:border-white/40"
            />
            <button
              onClick={join}
              className="rounded-md border border-white/20 px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10"
            >
              Join
            </button>
          </div>
          {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
        </section>
      </div>
    </main>
  );
}
