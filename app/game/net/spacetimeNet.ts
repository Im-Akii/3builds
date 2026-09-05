"use client";

import { DbConnection } from "./spacetime";
import type { JoinFailure, NetClient, NetMessage, PlayerInfo, RoomState } from "./types";
import { WATCHABLE } from "./types";

/**
 * SpacetimeDB implementation of the NetClient transport.
 */
export class SpacetimeNet implements NetClient {
  readonly kind = "spacetime" as const;
  private conn: DbConnection | null = null;
  private listeners = new Set<(m: NetMessage) => void>();
  private code = "";

  async connect(code: string): Promise<void> {
    this.code = code;
    if (this.conn) this.disconnect();

    const host = process.env.NEXT_PUBLIC_SPACETIME_HOST || "wss://testnet.spacetimedb.com";
    const nameOrAddress = process.env.NEXT_PUBLIC_SPACETIME_MODULE_NAME || "one-heist-spacetime";

    return new Promise((resolve, reject) => {
      const conn = DbConnection.builder()
        .withUri(host)
        .withDatabaseName(nameOrAddress)
        .withToken("") // Anonymous connection by default for clients
        .onConnect((connectedConn, identity, token) => {
          resolve();
        })
        .onDisconnect(() => {
          // handled
        })
        .build();
        
      this.conn = conn;

      conn.subscriptionBuilder()
        .onApplied(() => {})
        .subscribe(`SELECT * FROM game_room WHERE code = '${code}'; SELECT * FROM player WHERE room_code = '${code}'; SELECT * FROM thief_state WHERE room_code = '${code}'; SELECT * FROM discovered_item WHERE room_code = '${code}'; SELECT * FROM game_event WHERE room_code = '${code}';`);

      conn.db.gameRoom.onInsert((ctx, row) => {
        if (row.code !== this.code) return;
        this.notifyRoomChange(ctx.db);
      });
      conn.db.gameRoom.onUpdate((ctx, oldRow, newRow) => {
        if (newRow.code !== this.code) return;
        this.notifyRoomChange(ctx.db);
      });

      conn.db.player.onInsert((ctx, row) => {
        if (row.roomCode !== this.code) return;
        this.notifyRoomChange(ctx.db);
      });
      conn.db.player.onUpdate((ctx, oldRow, newRow) => {
        if (newRow.roomCode !== this.code) return;
        this.notifyRoomChange(ctx.db);
      });
      conn.db.player.onDelete((ctx, row) => {
        if (row.roomCode !== this.code) return;
        this.notifyRoomChange(ctx.db);
      });

      conn.db.thiefState.onInsert((ctx, row) => {
        if (row.roomCode !== this.code) return;
        this.notifyWorldState(ctx.db);
      });
      conn.db.thiefState.onUpdate((ctx, oldRow, newRow) => {
        if (newRow.roomCode !== this.code) return;
        this.notifyWorldState(ctx.db);
      });
      
      conn.db.discoveredItem.onInsert((ctx, row) => {
        if (row.roomCode !== this.code) return;
        for (const cb of this.listeners) {
          cb({ type: "discover", itemId: row.itemId, by: row.by });
        }
      });
      
      // Safety timeout
      setTimeout(() => reject(new Error("Timeout")), 5000);
    });
  }

  private notifyRoomChange(db: any) {
    const r = db.gameRoom.code.find(this.code);
    if (!r) return;

    const players: PlayerInfo[] = [];
    for (const p of db.player.iter()) {
      if (p.roomCode === this.code) {
        players.push({
          id: p.id,
          name: p.name,
          role: p.role === "thief" || p.role === "spectator" ? p.role : null,
          watching: WATCHABLE.includes(p.watching as any) ? (p.watching as any) : null,
          joinedAt: Number(p.joinedAt),
        });
      }
    }

    const state: RoomState = {
      code: r.code,
      hostId: r.host,
      maxPlayers: r.maxPlayers,
      phase: r.phase as any,
      startsAt: Number(r.startsAt) || null,
      players,
      createdAt: Number(r.createdAt),
      seed: r.seed,
      result: r.result === "escaped" || r.result === "down" ? r.result : null,
    };

    for (const cb of this.listeners) {
      cb({ type: "room", room: state });
    }
  }

  private notifyWorldState(db: any) {
    const ts = db.thiefState.roomCode.find(this.code);
    if (!ts) return;

    let extra = {};
    try {
      extra = JSON.parse(ts.extra);
    } catch {}

    const items: string[] = [];
    for (const item of db.discoveredItem.iter()) {
      if (item.roomCode === this.code) {
        items.push(item.itemId);
      }
    }

    const log: any[] = [];
    for (const ev of db.gameEvent.iter()) {
      if (ev.roomCode === this.code) {
        log.push({
          id: Number(ev.id),
          text: ev.text,
          tone: ev.tone as any,
        });
      }
    }

    const snap = {
      t: Number(ts.updatedAt),
      thief: [ts.x, ts.y, ts.z, ts.yaw],
      room: ts.area,
      hp: ts.hp,
      alarm: ts.alarm,
      spotted: ts.spotted,
      keycard: ts.keycard,
      codeFound: ts.codeFound,
      vaultOpen: ts.vaultOpen,
      alarmDisabled: ts.alarmDisabled,
      escaped: ts.escaped,
      down: false, 
      loot: ts.loot,
      score: ts.score,
      discovered: items,
      log,
      ...extra,
    } as any;

    for (const cb of this.listeners) {
      cb({ type: "world", snap });
    }
  }

  disconnect(): void {
    if (this.conn) {
      this.conn.disconnect();
      this.conn = null;
    }
    this.listeners.clear();
  }

  async createRoom(room: RoomState): Promise<RoomState | null> {
    if (!this.conn) return null;
    this.conn.reducers.createRoom({
      code: room.code,
      maxPlayers: room.maxPlayers,
      seed: room.seed,
      name: "Host"
    });
    return room;
  }

  async join(code: string, player: PlayerInfo): Promise<{ room: RoomState } | { error: JoinFailure }> {
    if (!this.conn) return { error: "notfound" };
    this.conn.reducers.joinRoom({
      code,
      name: player.name
    });
    return { room: { code, players: [player], hostId: "", maxPlayers: 4, phase: "lobby", startsAt: null, createdAt: Date.now(), seed: 0, result: null } };
  }

  leave(code: string, playerId: string): void {
    if (!this.conn) return;
    this.conn.reducers.leaveRoom({ code });
  }

  start(code: string): void {
    if (!this.conn) return;
    this.conn.reducers.startRun({ code });
  }

  send(msg: NetMessage): void {
    if (!this.conn) return;
    if (msg.type === "world") {
      const snap = msg.snap;
      const extra = JSON.stringify({
        guards: snap.guards,
        cams: snap.cams,
        collected: snap.collected,
        doorsOpen: snap.doorsOpen,
        explored: snap.explored,
      });
      
      this.conn.reducers.publishWorld({
        code: this.code,
        x: snap.thief[0], 
        y: snap.thief[1], 
        z: snap.thief[2], 
        yaw: snap.thief[3],
        area: snap.room,
        hp: snap.hp,
        alarm: snap.alarm,
        spotted: snap.spotted,
        keycard: snap.keycard,
        codeFound: snap.codeFound,
        vaultOpen: snap.vaultOpen,
        alarmDisabled: snap.alarmDisabled,
        escaped: snap.escaped,
        loot: snap.loot,
        score: snap.score,
        extra
      });
    } else if (msg.type === "discover") {
      this.conn.reducers.discoverItem({ code: this.code, itemId: msg.itemId });
    }
  }

  onMessage(cb: (m: NetMessage) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
