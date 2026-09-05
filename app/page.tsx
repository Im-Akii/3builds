import Link from "next/link";

const VIEWS = [
  {
    n: "1",
    name: "Thief view",
    color: "#4aa8ff",
    body: "First person, inside the building. A normal facility - no labels, no camera cones, no traps. One player gets this.",
  },
  {
    n: "2",
    name: "Spectator view",
    color: "#39ff88",
    body: "A cutaway of one room. Camera cones, the guard's patrol, the keypad, the keycard - the layer the thief is blind to.",
  },
  {
    n: "3",
    name: "Discovery mode",
    color: "#ffd23b",
    body: "Same room, scanning for what nobody has found yet: hidden cameras, vents, floor traps, the note with the vault code.",
  },
];

const STEPS = [
  "Create a room and share the link. Up to four players.",
  "Ten second countdown - roles are drawn at random.",
  "One thief walks in from the street. Everyone else is posted to a single room and can only see that room.",
  "Spectators scan their room and call out what they find. The thief hears it and acts on it.",
  "Keycard, then the vault code, then the vault. Get back out to the street.",
];

export default function Home() {
  return (
    <main className="relative flex-1 overflow-y-auto bg-[#070b11] text-zinc-100">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-14 px-6 py-16">
        <header className="flex flex-col gap-5">
          <span className="w-fit rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-zinc-400">
            asymmetric multiplayer heist
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            One thief walks in blind.
            <br />
            <span className="text-zinc-500">Everyone else can see.</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
            A lobby, a security room and a vault, built out of boxes with
            Three.js, React Three Fiber and Rapier. The thief moves through the
            building and cannot see a single camera cone, floor trap or hidden
            vent. The spectators can - but each one is stuck watching a single
            room. The only way through is to talk to each other.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/rooms"
              className="rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
            >
              Create a room
            </Link>
            <Link
              href="/play"
              className="rounded-md border border-white/20 px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10"
            >
              Try it solo
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {VIEWS.map((v) => (
            <div
              key={v.n}
              className="rounded-xl border bg-black/40 p-4"
              style={{ borderColor: `${v.color}44` }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: v.color }}
              >
                {v.n}. {v.name}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                {v.body}
              </p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            How a run goes
          </h2>
          <ol className="flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-300">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/20 text-[10px] text-zinc-400">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-auto border-t border-white/10 pt-6 text-[11px] text-zinc-600">
          Prototype. Rooms are carried between tabs of one browser by default;
          point it at the SpacetimeDB module to play across devices.
        </footer>
      </div>
    </main>
  );
}
