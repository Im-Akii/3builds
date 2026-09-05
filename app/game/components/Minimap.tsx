"use client";

import { useEffect, useRef } from "react";
import { ESCAPE_Z, PATROLS, ROOMS, type RoomId } from "../level";
import { guardState, runtime } from "../runtime";
import { useGame } from "../store";

const MIN_X = -23.5;
const MAX_X = 23.5;
const MIN_Z = -11;
const MAX_Z = 20;
const W = MAX_X - MIN_X;
const H = MAX_Z - MIN_Z;

const sx = (x: number) => x - MIN_X;
const sy = (z: number) => z - MIN_Z;

const PLAN: RoomId[] = ["sec", "wcorr", "lobby", "ecorr", "vault", "entry", "annex"];

/** Flat floorplan with a dot for the thief. Reads runtime directly at 20hz. */
export default function Minimap() {
  const mode = useGame((s) => s.mode);
  const thiefRoom = useGame((s) => s.room);
  const watching = mode.kind === "spectator" ? mode.watching : null;
  // the thief must not get guard positions for free
  const showGuards = mode.kind !== "thief";
  const thief = useRef<SVGCircleElement>(null);
  const guards = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 50) return;
      last = t;
      if (thief.current) {
        thief.current.setAttribute("cx", String(sx(runtime.thief.x)));
        thief.current.setAttribute("cy", String(sy(runtime.thief.z)));
      }
      PATROLS.forEach((p, i) => {
        const el = guards.current[i];
        if (!el) return;
        const g = guardState(p.id);
        el.setAttribute("cx", String(sx(g.pos.x)));
        el.setAttribute("cy", String(sy(g.pos.z)));
        const visible =
          showGuards && (watching ? watching === p.room : true);
        el.setAttribute("opacity", visible ? "0.9" : "0");
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [watching, showGuards]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/70 p-2 backdrop-blur">
      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-zinc-500">
        <span>Floorplan</span>
        <span className="text-zinc-400">{thiefRoom}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-[112px] w-[168px] overflow-visible"
      >
        {/* street / approach */}
        <rect
          x={sx(-14)}
          y={sy(10.5)}
          width={28}
          height={9}
          fill="#12161c"
          stroke="#2a313a"
          strokeWidth={0.2}
        />
        {PLAN.map((id) => {
          const r = ROOMS.find((x) => x.id === id)!;
          const b = r.bounds;
          const mine = watching === id;
          return (
            <rect
              key={id}
              x={sx(b.minX)}
              y={sy(b.minZ)}
              width={b.maxX - b.minX}
              height={b.maxZ - b.minZ}
              fill={mine ? "#1d2b24" : "#171c23"}
              stroke={mine ? "#39ff88" : "#39414d"}
              strokeWidth={mine ? 0.5 : 0.25}
            />
          );
        })}

        {/* extraction */}
        <circle
          cx={sx(0)}
          cy={sy(ESCAPE_Z + 2)}
          r={1.1}
          fill="none"
          stroke="#39ff88"
          strokeWidth={0.35}
        />

        {PATROLS.map((p, i) => (
          <circle
            key={p.id}
            ref={(el) => {
              guards.current[i] = el;
            }}
            r={0.8}
            fill="#4aa8ff"
            opacity={0}
          />
        ))}

        <circle ref={thief} r={1.05} fill="#ffd23b" stroke="#000" strokeWidth={0.2} />
      </svg>
      <div className="mt-1 flex gap-3 text-[9px] text-zinc-500">
        <span className="text-yellow-300">● thief</span>
        {showGuards && <span className="text-sky-400">● guard</span>}
        {watching && <span className="text-emerald-400">▭ your room</span>}
      </div>
    </div>
  );
}
