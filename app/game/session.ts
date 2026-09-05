"use client";

import { create } from "zustand";
import { createNet } from "./net";
import {
  MAX_PLAYERS,
  newId,
  type NetClient,
  type NetMessage,
  type PlayerInfo,
  type RoomState,
  type Snapshot,
} from "./net/types";

export { assignRoles, resolveRoom } from "./net/roles";

export type SessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "notfound"
  | "full";

interface SessionState {
  net: NetClient | null;
  status: SessionStatus;
  code: string | null;
  myId: string | null;
  room: RoomState | null;
  /** true while this tab owns the room record */
  isHost: boolean;
  /** latest snapshot received from the thief's client (spectators only) */
  lastSnapshot: Snapshot | null;

  connect: (code: string, name: string, asHost?: RoomState) => Promise<void>;
  leave: () => void;
  startNow: () => void;
  sendDiscover: (itemId: string) => void;
  publish: (snap: Snapshot) => void;
  onSnapshot: (cb: (s: Snapshot) => void) => () => void;
  onDiscover: (cb: (itemId: string) => void) => () => void;
}

const snapshotSubs = new Set<(s: Snapshot) => void>();
const discoverSubs = new Set<(id: string) => void>();
let unsubscribe: (() => void) | null = null;

export const useSession = create<SessionState>()((set, get) => ({
  net: null,
  status: "idle",
  code: null,
  myId: null,
  room: null,
  isHost: false,
  lastSnapshot: null,

  connect: async (code, name, seedRoom) => {
    get().leave();

    const net = createNet();
    const myId = newId();
    const me: PlayerInfo = {
      id: myId,
      name: name.trim() || "player",
      role: null,
      watching: null,
      joinedAt: Date.now(),
    };

    set({ net, myId, code, status: "connecting" });

    unsubscribe = net.onMessage((msg: NetMessage) => {
      switch (msg.type) {
        case "room": {
          if (!msg.room || msg.room.code !== get().code) return;
          set({
            room: msg.room,
            status: "connected",
            isHost: msg.room.hostId === get().myId,
          });
          break;
        }
        case "world": {
          set({ lastSnapshot: msg.snap });
          for (const cb of snapshotSubs) cb(msg.snap);
          break;
        }
        case "discover": {
          if (msg.by === get().myId) return; // we applied it optimistically
          for (const cb of discoverSubs) cb(msg.itemId);
          break;
        }
      }
    });

    await net.connect(code);
    if (seedRoom) await net.createRoom({ ...seedRoom, hostId: "" });

    const result = await net.join(code, me);
    if ("error" in result) {
      set({ status: result.error === "full" ? "full" : "notfound" });
      return;
    }
    set({
      room: result.room,
      status: "connected",
      isHost: result.room.hostId === myId,
    });
  },

  startNow: () => {
    const s = get();
    if (!s.code) return;
    s.net?.start(s.code);
  },

  leave: () => {
    const s = get();
    if (s.net && s.myId && s.code) s.net.leave(s.code, s.myId);
    unsubscribe?.();
    unsubscribe = null;
    s.net?.disconnect();
    snapshotSubs.clear();
    discoverSubs.clear();
    set({
      net: null,
      status: "idle",
      code: null,
      myId: null,
      room: null,
      isHost: false,
      lastSnapshot: null,
    });
  },

  sendDiscover: (itemId) => {
    const s = get();
    s.net?.send({ type: "discover", itemId, by: s.myId ?? "?" });
  },

  publish: (snap) => {
    get().net?.send({ type: "world", snap });
  },

  onSnapshot: (cb) => {
    snapshotSubs.add(cb);
    return () => snapshotSubs.delete(cb);
  },

  onDiscover: (cb) => {
    discoverSubs.add(cb);
    return () => discoverSubs.delete(cb);
  },
}));

/** Convenience selectors */
export const myPlayer = (s: SessionState): PlayerInfo | null =>
  s.room?.players.find((p) => p.id === s.myId) ?? null;

export const roomIsFull = (r: RoomState | null) =>
  !!r && r.players.length >= Math.min(r.maxPlayers, MAX_PLAYERS);
