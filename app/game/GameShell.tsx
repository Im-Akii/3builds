"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import Minimap from "./components/Minimap";
import { CAMERAS, MARKERS, roomById } from "./level";
import { useGame, VIEWS, type ViewMode } from "./store";

const GameCanvas = dynamic(() => import("./GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-xs tracking-widest text-zinc-500">
      LOADING FACILITY...
    </div>
  ),
});

const HIDDEN = [...CAMERAS, ...MARKERS].filter((m) => m.reveal === "discovery");

function Bar({
  label,
  value,
  color,
  danger,
}: {
  label: string;
  value: number;
  color: string;
  danger?: boolean;
}) {
  return (
    <div className="w-36">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-zinc-400">
        <span>{label}</span>
        <span style={{ color: danger ? "#ff5a63" : color }}>
          {Math.round(value)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function DiscoveryPanel() {
  const discovered = useGame((s) => s.discovered);
  const mode = useGame((s) => s.mode);
  const explored = useGame((s) => s.explored);
  const mine =
    mode.kind === "spectator"
      ? HIDDEN.filter((m) => m.room === mode.watching)
      : HIDDEN;
  const found = mine.filter((m) => discovered[m.id]).length;
  const canSee = (room: string) =>
    mode.kind === "spectator"
      ? mode.watching === room
      : !!explored[room as keyof typeof explored];

  return (
    <div className="w-56 rounded-lg border border-yellow-400/30 bg-black/70 p-3 backdrop-blur">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-yellow-300/80">
          Hidden things
        </span>
        <span className="font-mono text-xs text-yellow-300">
          {found}/{mine.length}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {mine.map((m) => {
          const got = !!discovered[m.id];
          const open = canSee(m.room);
          return (
            <li
              key={m.id}
              className="flex items-center gap-2 text-[11px]"
              style={{ color: got ? m.color : open ? "#8b94a1" : "#4b5563" }}
            >
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: got ? m.color : "#374151" }}
              />
              <span className="truncate">
                {got
                  ? m.label
                  : open
                    ? "unidentified"
                    : `sealed - ${roomById(m.room).name}`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-zinc-500">
        Click a pulsing blip to scan it. Call out what you find - the thief
        cannot see any of this.
      </p>
    </div>
  );
}

function Log() {
  const log = useGame((s) => s.log);
  if (!log.length) return null;
  return (
    <div className="w-64 space-y-1 text-right">
      {log.map((l, i) => (
        <div
          key={l.id}
          className="text-[11px] leading-snug"
          style={{
            color:
              l.tone === "bad"
                ? "#ff6b73"
                : l.tone === "good"
                  ? "#5dffa8"
                  : "#9ca3af",
            opacity: 1 - i * 0.14,
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}

function EndCard({ onReset }: { onReset?: () => void }) {
  const escaped = useGame((s) => s.escaped);
  const hp = useGame((s) => s.hp);
  const score = useGame((s) => s.score);
  const solo = useGame((s) => s.mode.kind === "solo");
  const reset = useGame((s) => s.reset);
  if (!escaped && hp > 0) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-xl border border-white/15 bg-zinc-950/90 px-8 py-6 text-center">
        <div
          className="text-2xl font-bold tracking-wide"
          style={{ color: escaped ? "#5dffa8" : "#ff6b73" }}
        >
          {escaped ? "ESCAPED" : "THIEF DOWN"}
        </div>
        <div className="mt-1 text-xs text-zinc-400">Score {score}</div>
        {solo && (
          <button
            onClick={() => {
              reset();
              onReset?.();
            }}
            className="mt-4 rounded-md border border-white/20 px-4 py-1.5 text-xs uppercase tracking-widest text-zinc-200 hover:bg-white/10"
          >
            Run it again
          </button>
        )}
      </div>
    </div>
  );
}

export default function GameShell({ title }: { title?: string }) {
  const mode = useGame((s) => s.mode);
  const view = useGame((s) => s.view);
  const setView = useGame((s) => s.setView);
  const hp = useGame((s) => s.hp);
  const alarm = useGame((s) => s.alarm);
  const spotted = useGame((s) => s.spotted);
  const loot = useGame((s) => s.loot);
  const score = useGame((s) => s.score);
  const prompt = useGame((s) => s.prompt);
  const codeFound = useGame((s) => s.codeFound);
  const keycard = useGame((s) => s.keycard);
  const vaultOpen = useGame((s) => s.vaultOpen);
  const alarmDisabled = useGame((s) => s.alarmDisabled);
  const room = useGame((s) => s.room);
  const explored = useGame((s) => s.explored);
  const gotLoot = useGame((s) => !!s.collected["vault-loot"]);
  const reset = useGame((s) => s.reset);

  const solo = mode.kind === "solo";
  const spectator = mode.kind === "spectator";
  const v = VIEWS.find((x) => x.id === view)!;

  useEffect(() => {
    if (!solo) return;
    const onKey = (e: KeyboardEvent) => {
      const i = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
      if (i >= 0) setView(VIEWS[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setView, solo]);

  const objective = gotLoot
    ? "Get back out through the entrance."
    : vaultOpen
      ? "Take the vault contents."
      : keycard
        ? "Vault room is unlocked - use the keypad by the round door (E)."
        : explored.lobby
          ? "Find the keycard in the security room (west door)."
          : "Walk in through the main entrance.";

  return (
    <div className="absolute inset-0 overflow-hidden bg-black text-zinc-100">
      <GameCanvas />

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <div className="pointer-events-auto flex max-w-md flex-col gap-3">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-200">
              {title ?? "Facility heist"}
            </h1>
            <p className="text-[11px] text-zinc-500">
              {spectator
                ? `You are posted to the ${roomById(mode.watching).name}. You see what the thief cannot - tell them.`
                : mode.kind === "thief"
                  ? "You are the thief. You cannot see cameras, traps or guards' cones - your spectators can."
                  : "Solo sandbox: you drive the thief and can look through all three layers."}
            </p>
          </div>
          <div
            className="rounded-lg border bg-black/70 px-3 py-2 backdrop-blur"
            style={{ borderColor: `${v.color}66` }}
          >
            <div
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: v.color }}
            >
              {spectator
                ? `${roomById(mode.watching).name} - ${view === "discovery" ? "discovery" : "spectator"}`
                : `${v.n}. ${v.title}`}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-zinc-400">
              {v.blurb}
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {solo && (
              <select
                value={view}
                onChange={(e) => setView(e.target.value as ViewMode)}
                className="rounded-md border border-white/20 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-white/40"
              >
                {VIEWS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.n}. {x.title}
                  </option>
                ))}
              </select>
            )}
            {spectator && (
              <div className="flex overflow-hidden rounded-md border border-white/20">
                {(["spectator", "discovery"] as ViewMode[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={`px-3 py-2 text-[11px] uppercase tracking-widest ${
                      view === id
                        ? "bg-white/15 text-zinc-100"
                        : "bg-zinc-950/90 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {id === "spectator" ? "Watch" : "Discover"}
                  </button>
                ))}
              </div>
            )}
            {solo && (
              <button
                onClick={reset}
                className="rounded-md border border-white/20 bg-zinc-950/90 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-300 hover:bg-white/10"
              >
                Reset
              </button>
            )}
          </div>
          <Minimap />
        </div>
      </div>

      {/* right column */}
      <div className="pointer-events-none absolute right-4 top-[15.5rem] flex flex-col items-end gap-3">
        {(view === "discovery" || spectator) && (
          <div className="pointer-events-auto">
            <DiscoveryPanel />
          </div>
        )}
        <Log />
      </div>

      {/* bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/70 p-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400">
              {roomById(room).name}
            </span>
            <span className="text-[11px] text-zinc-300">{objective}</span>
          </div>
          <div className="flex gap-5">
            <Bar label="HP" value={hp} color="#5dffa8" danger={hp < 35} />
            <Bar
              label={
                alarmDisabled
                  ? "Alarm - offline"
                  : spotted
                    ? "Alarm - seen!"
                    : "Alarm"
              }
              value={alarmDisabled ? 0 : alarm}
              color="#ff6b73"
              danger={alarm > 60}
            />
          </div>
          <div className="flex flex-wrap gap-3 font-mono text-[11px] text-zinc-400">
            <span className={keycard ? "text-yellow-300" : ""}>
              keycard {keycard ? "yes" : "no"}
            </span>
            <span className={codeFound ? "text-emerald-400" : ""}>
              code {codeFound ? "4712" : "????"}
            </span>
            <span>loot {loot}</span>
            <span>score {score}</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/70 p-3 text-right text-[11px] leading-relaxed text-zinc-400 backdrop-blur">
          {spectator ? (
            <>
              <div>drag to orbit · scroll to zoom</div>
              <div>
                <span className="text-zinc-200">Watch / Discover</span> switches
                layer
              </div>
              <div>you cannot leave this room</div>
            </>
          ) : (
            <>
              <div>
                <span className="text-zinc-200">WASD</span> move ·{" "}
                <span className="text-zinc-200">Shift</span> run ·{" "}
                <span className="text-zinc-200">E</span> interact
              </div>
              <div>
                {view === "thief"
                  ? "click to capture the mouse · Esc releases"
                  : "drag to orbit · scroll to zoom"}
              </div>
              {solo && (
                <div>
                  <span className="text-zinc-200">1 / 2 / 3</span> switch view
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {prompt && !spectator && (
        <div className="pointer-events-none absolute inset-x-0 bottom-36 flex justify-center">
          <div className="rounded-md border border-yellow-400/40 bg-black/80 px-3 py-1.5 text-[11px] text-yellow-200">
            {prompt}
          </div>
        </div>
      )}

      {view === "thief" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
      )}

      <EndCard />
    </div>
  );
}
