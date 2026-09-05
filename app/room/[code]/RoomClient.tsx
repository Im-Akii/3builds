"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import GameShell from "../../game/GameShell";
import { roomById } from "../../game/level";
import { COUNTDOWN_MS, type RoomState } from "../../game/net/types";
import { resolveRoom, useSession } from "../../game/session";
import { useGame } from "../../game/store";

const NAME_KEY = "heist:name";

/** Read browser storage without tripping hydration or effect-ordering rules. */
const noSubscribe = () => () => {};
function useStored<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscribe, read, () => serverValue);
}

function useCountdown(startsAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startsAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(t);
  }, [startsAt]);
  if (startsAt === null) return null;
  return Math.max(0, Math.ceil((startsAt - now) / 1000));
}

export default function RoomClient({ code }: { code: string }) {
  const connect = useSession((s) => s.connect);
  const leave = useSession((s) => s.leave);
  const startNow = useSession((s) => s.startNow);
  const status = useSession((s) => s.status);
  const rawRoom = useSession((s) => s.room);
  const myId = useSession((s) => s.myId);
  const isHost = useSession((s) => s.isHost);

  const [edited, setEdited] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const readName = useCallback(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  }, []);
  const readSeat = useCallback(() => {
    try {
      const seat = sessionStorage.getItem(`heist:host:${code}`);
      return seat ? Number(seat) : null;
    } catch {
      return null;
    }
  }, [code]);

  const storedName = useStored(readName, "");
  const hostSize = useStored(readSeat, null);
  const name = edited ?? storedName;

  useEffect(() => () => leave(), [leave]);

  const countdown = useCountdown(
    rawRoom?.phase === "countdown" ? rawRoom.startsAt : null,
  );
  // the draw happens on the clock, not when the host's tab wakes up; the
  // countdown ticker above is what re-renders us as the clock runs out
  const room = resolveRoom(rawRoom);
  const me = room?.players.find((p) => p.id === myId) ?? null;

  // hand the drawn role to the game
  useEffect(() => {
    if (room?.phase !== "playing" || !me?.role) return;
    const game = useGame.getState();
    game.reset();
    game.setMode(
      me.role === "thief"
        ? { kind: "thief" }
        : { kind: "spectator", watching: me.watching ?? "lobby" },
    );
  }, [room?.phase, me?.role, me?.watching]);

  const join = async () => {
    const n = name.trim() || `player-${Math.floor(Math.random() * 900 + 100)}`;
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {
      /* ignore */
    }
    setJoining(true);
    const seed: RoomState | undefined =
      hostSize !== null
        ? {
            code,
            hostId: "",
            maxPlayers: hostSize,
            phase: "lobby",
            startsAt: null,
            players: [],
            createdAt: Date.now(),
            seed: Math.floor(Math.random() * 2 ** 31),
            result: null,
          }
        : undefined;
    await connect(code, n, seed);
    setJoining(false);
  };

  /* ---------------------------------------------------------------- gate */

  if (status === "idle") {
    return (
      <Frame code={code}>
        <h1 className="text-2xl font-bold tracking-tight">
          {hostSize !== null ? "Open your room" : "Join room"}{" "}
          <span className="font-mono text-zinc-500">{code}</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {hostSize !== null
            ? `Up to ${hostSize} players. Share the link once you are in.`
            : "Pick a name and drop in. Roles are drawn when the countdown ends."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setEdited(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="your name"
            maxLength={16}
            className="w-56 rounded-md border border-white/20 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
          <button
            onClick={join}
            disabled={joining}
            className="rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white disabled:opacity-50"
          >
            {joining ? "..." : hostSize !== null ? "Open room" : "Join"}
          </button>
        </div>
      </Frame>
    );
  }

  if (status === "notfound" || status === "full") {
    return (
      <Frame code={code}>
        <h1 className="text-2xl font-bold tracking-tight">
          {status === "full" ? "That room is full" : "No such room"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {status === "full"
            ? "Every seat is taken. Ask the host to start a new one."
            : "Nobody is hosting this code in this browser. Rooms live in the tab that created them."}
        </p>
        <Link
          href="/rooms"
          className="mt-6 inline-block rounded-md border border-white/20 px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/10"
        >
          Back to rooms
        </Link>
      </Frame>
    );
  }

  /* --------------------------------------------------------------- game */

  if (room?.phase === "playing" && me?.role) {
    return (
      <main className="relative flex-1">
        <GameShell
          title={
            me.role === "thief"
              ? `Thief · room ${code}`
              : `${roomById(me.watching ?? "lobby").name} · room ${code}`
          }
        />
      </main>
    );
  }

  /* -------------------------------------------------------------- lobby */

  const link =
    typeof window !== "undefined" ? `${location.origin}/room/${code}` : "";

  return (
    <Frame code={code}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Room <span className="font-mono text-zinc-500">{code}</span>
        </h1>
        <span className="text-[11px] uppercase tracking-widest text-zinc-500">
          {room ? `${room.players.length}/${room.maxPlayers} players` : "..."}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          className="w-full max-w-md rounded-md border border-white/15 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 outline-none sm:w-auto sm:flex-1"
        />
        <button
          onClick={() => {
            navigator.clipboard?.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-md border border-white/20 px-4 py-2 text-xs text-zinc-200 hover:bg-white/10"
        >
          {copied ? "copied" : "copy link"}
        </button>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {room?.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
          >
            <span className={p.id === myId ? "text-zinc-100" : "text-zinc-400"}>
              {p.name}
              {p.id === room.hostId && (
                <span className="ml-2 text-[10px] uppercase tracking-widest text-zinc-600">
                  host
                </span>
              )}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-zinc-600">
              {p.id === myId ? "you" : "ready"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center gap-4">
        {room?.phase === "countdown" ? (
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold text-emerald-400">
              {countdown ?? Math.ceil(COUNTDOWN_MS / 1000)}
            </span>
            <span className="text-xs text-zinc-500">
              roles are drawn at zero
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500">
            Waiting for one more player...
          </span>
        )}
        {isHost && room?.phase !== "playing" && (
          <button
            onClick={startNow}
            className="rounded-md border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-zinc-200 hover:bg-white/10"
          >
            Start now
          </button>
        )}
      </div>

      <p className="mt-6 max-w-lg text-[11px] leading-relaxed text-zinc-600">
        One player is drawn as the thief and walks in from the street. Everyone
        else is posted to a single room - lobby, security or vault - and can only
        see that one. Talk to each other; the thief cannot see any of the
        security layer.
      </p>
    </Frame>
  );
}

function Frame({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <main className="relative flex-1 overflow-y-auto bg-[#070b11] text-zinc-100">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-16">
        <Link
          href="/rooms"
          className="text-[11px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
        >
          ← rooms
        </Link>
        <div className="mt-6">{children}</div>
        <div className="mt-auto pt-10 text-[11px] text-zinc-700">
          room {code}
        </div>
      </div>
    </main>
  );
}
