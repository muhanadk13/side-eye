import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  ANSWER_MAX,
  NAME_MAX,
  createRoom,
  makeCode,
  makePlayer,
  startGame,
  nextRound,
  setPhase,
  pendingPlayers,
  computeResults,
  finishGame,
  resetToLobby,
  viewFor,
  allPlayers,
  SPEED,
} from './game.js';
import { CATEGORY_IDS } from './questions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** code -> room */
const rooms = new Map();
/** ws -> { roomCode, playerId } */
const sessions = new Map();

const ROOM_TTL = 1000 * 60 * 90;
/** How long a lobby seat survives a disconnect (covers a refresh). */
const LOBBY_GRACE = 45000;

/* ───────────────────────────── broadcast ───────────────────────────── */

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function socketsFor(room) {
  const out = [];
  for (const [ws, s] of sessions) {
    if (s.roomCode === room.code && ws.readyState === 1) out.push([ws, s.playerId]);
  }
  return out;
}

function broadcast(room) {
  for (const [ws, playerId] of socketsFor(room)) {
    try {
      send(ws, { t: 'state', state: viewFor(room, playerId) });
    } catch (e) {
      console.error('broadcast failed for', playerId, e);
    }
  }
}

function toast(room, text, only = null) {
  for (const [ws, playerId] of socketsFor(room)) {
    if (only && playerId !== only) continue;
    send(ws, { t: 'toast', text });
  }
}

/* ─────────────────────────── phase driver ─────────────────────────── */

const NEXT = {
  round_intro: 'question',
  question: 'reveal_answers',
  reveal_answers: 'discussion',
  discussion: 'voting',
  voting: 'odd_guess',
  odd_guess: 'reveal_votes',
  reveal_votes: 'reveal_identity',
  reveal_identity: 'reveal_question',
  reveal_question: 'scoreboard',
};

function clearTimer(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

const DBG = process.env.SIDE_EYE_DEBUG === '1';
const dbg = (...a) => DBG && console.log('[dbg]', ...a);

function scheduleAdvance(room) {
  clearTimer(room);
  if (!room.phaseEndsAt) return;
  const ms = Math.max(30, room.phaseEndsAt - Date.now());
  dbg('schedule', room.code, room.phase, ms);
  room.timer = setTimeout(() => {
    dbg('fire', room.code, room.phase);
    try {
      advance(room);
    } catch (e) {
      console.error('advance threw', room.phase, e);
    }
  }, ms);
}

function enter(room, phase) {
  if (phase === 'reveal_votes') computeResults(room);
  setPhase(room, phase);
  scheduleAdvance(room);
  broadcast(room);
}

function advance(room) {
  dbg('advance from', room.code, room.phase, 'r' + room.round);
  clearTimer(room);
  if (room.phase === 'lobby' || room.phase === 'final') return;

  if (room.phase === 'scoreboard') {
    if (room.round >= room.settings.rounds) {
      finishGame(room);
      broadcast(room);
    } else {
      nextRound(room);
      if (room.phase === 'final') broadcast(room);
      else {
        scheduleAdvance(room);
        broadcast(room);
      }
    }
    return;
  }

  const next = NEXT[room.phase];
  if (!next) return;

  // Skip the reveal sequence entirely if literally nobody answered.
  if (next === 'reveal_answers' && room.roundData && room.roundData.answers.size === 0) {
    toast(room, 'Nobody answered. Skipping the round.');
    room.round -= 1;
    room.roundData = null;
    room.phase = 'scoreboard';
    return advance(room);
  }

  enter(room, next);
}

/** Called after a player acts — jump ahead if everyone is done. */
function maybeSkipAhead(room) {
  const pending = pendingPlayers(room);
  if (pending.length > 0) return false;
  if (!['question', 'voting', 'odd_guess'].includes(room.phase)) return false;
  // Tiny grace so the "LOCKED IN" state is actually seen.
  clearTimer(room);
  const grace = Math.max(120, Math.round(900 * SPEED));
  room.phaseEndsAt = Date.now() + grace;
  room.phaseTotal = grace;
  room.timer = setTimeout(() => {
    try {
      advance(room);
    } catch (e) {
      console.error('advance threw (skip-ahead)', room.phase, e);
    }
  }, grace);
  return true;
}

/**
 * Watchdog. A party game must never freeze on a table of people, so if any
 * room sits past its deadline we drag it forward regardless of why.
 */
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.phase === 'lobby' || room.phase === 'final') continue;
    if (!room.phaseEndsAt || now <= room.phaseEndsAt + 2500) continue;
    console.warn(
      `[watchdog] ${room.code} stuck in ${room.phase} (round ${room.round}) — forcing advance`
    );
    try {
      advance(room);
    } catch (e) {
      console.error('watchdog advance failed', e);
      finishGame(room, 'error');
      broadcast(room);
    }
  }
}, 1000).unref?.();

/* ─────────────────────────── helpers ─────────────────────────── */

/** Category picks are untrusted input: keep only known ids, no duplicates. */
function sanitizeCategories(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  for (const c of raw) {
    if (typeof c === 'string' && CATEGORY_IDS.includes(c)) seen.add(c);
  }
  return [...seen];
}

function sanitizeName(raw) {
  // Strip control chars and zero-width tricks, collapse whitespace.
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

function uniqueName(room, name) {
  const taken = new Set(allPlayers(room).map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; i < 30; i++) {
    const candidate = `${name.slice(0, NAME_MAX - 2)} ${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${name}?`;
}

function err(ws, code, message) {
  send(ws, { t: 'error', code, message });
}

function reassignHostIfNeeded(room) {
  const host = room.players.get(room.hostId);
  if (host && host.connected) return;
  const candidate = allPlayers(room).find((p) => p.connected);
  if (candidate && candidate.id !== room.hostId) {
    room.hostId = candidate.id;
    toast(room, `${candidate.name} is the host now.`);
  }
}

function detach(ws) {
  try {
    detachInner(ws);
  } catch (e) {
    console.error('detach failed', e);
  }
}

function detachInner(ws) {
  const s = sessions.get(ws);
  sessions.delete(ws);
  if (!s) return;
  const room = rooms.get(s.roomCode);
  if (!room) return;
  const p = room.players.get(s.playerId);
  if (!p) return;

  // Another live socket for the same player? Then this was a stale duplicate.
  const stillOpen = socketsFor(room).some(([, id]) => id === p.id);
  if (stillOpen) return;

  p.connected = false;
  p.lastSeen = Date.now();

  if (room.phase === 'lobby' || room.phase === 'final') {
    // Between games there is nothing to keep moving, so hold everything for a
    // beat: a refresh must not evict you, and must not hand your host badge
    // (and the "run it again" button) to someone else.
    clearTimeout(p.reapTimer);
    p.reapTimer = setTimeout(() => {
      const still = room.players.get(p.id);
      if (!still || still.connected) return;
      if (room.phase === 'lobby') {
        room.players.delete(p.id);
        room.order = room.order.filter((id) => id !== p.id);
      }
      reassignHostIfNeeded(room);
      room.version += 1;
      broadcast(room);
    }, LOBBY_GRACE);
  } else {
    // Mid-game the room needs a live host immediately so it can keep moving.
    reassignHostIfNeeded(room);
  }

  // If their absence means everyone remaining is already done, don't stall.
  if (room.roundData) maybeSkipAhead(room);
  broadcast(room);
}

/* ─────────────────────────── message handling ─────────────────────────── */

function handle(ws, msg) {
  const s = sessions.get(ws) ?? {};

  // Keepalive is seatless — it must work before you've joined anything.
  if (msg.t === 'ping') {
    send(ws, { t: 'pong', now: Date.now() });
    return;
  }

  switch (msg.t) {
    case 'create': {
      const name = sanitizeName(msg.name);
      if (!name) return err(ws, 'bad_name', 'Pick a name first.');
      const code = makeCode(new Set(rooms.keys()));
      const room = createRoom(code);
      const player = makePlayer(name);
      room.players.set(player.id, player);
      room.order.push(player.id);
      room.hostId = player.id;
      const cats = sanitizeCategories(msg.categories);
      if (cats) room.settings.categories = cats;
      rooms.set(code, room);
      sessions.set(ws, { roomCode: code, playerId: player.id });
      send(ws, { t: 'joined', code, playerId: player.id, token: player.token });
      broadcast(room);
      return;
    }

    case 'join': {
      const code = String(msg.code ?? '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return err(ws, 'no_room', "That room code doesn't exist.");
      const name = sanitizeName(msg.name);
      if (!name) return err(ws, 'bad_name', 'Pick a name first.');
      if (allPlayers(room).length >= MAX_PLAYERS)
        return err(ws, 'full', 'That room is full (10 max).');

      const player = makePlayer(uniqueName(room, name), {
        spectator: room.phase !== 'lobby',
      });
      room.players.set(player.id, player);
      room.order.push(player.id);
      if (!room.hostId) room.hostId = player.id;
      sessions.set(ws, { roomCode: code, playerId: player.id });
      send(ws, { t: 'joined', code, playerId: player.id, token: player.token });
      if (player.spectator)
        toast(room, `You're in — you'll join at the start of the next round.`, player.id);
      broadcast(room);
      return;
    }

    case 'rejoin': {
      const code = String(msg.code ?? '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return err(ws, 'no_room', 'That game is over.');
      const player = [...room.players.values()].find(
        (p) => p.id === msg.playerId && p.token === msg.token
      );
      if (!player) return err(ws, 'no_player', 'Could not restore that seat.');

      // Kick any stale socket for the same player.
      for (const [otherWs, os] of [...sessions]) {
        if (otherWs !== ws && os.playerId === player.id) {
          sessions.delete(otherWs);
          send(otherWs, { t: 'error', code: 'replaced', message: 'Opened somewhere else.' });
          try { otherWs.close(); } catch { /* already gone */ }
        }
      }

      player.connected = true;
      player.lastSeen = Date.now();
      clearTimeout(player.reapTimer);
      player.reapTimer = null;
      sessions.set(ws, { roomCode: code, playerId: player.id });
      if (!room.hostId || !room.players.get(room.hostId)?.connected) room.hostId = player.id;
      send(ws, { t: 'joined', code, playerId: player.id, token: player.token });
      broadcast(room);
      return;
    }
  }

  // Everything below requires a seat.
  const room = rooms.get(s.roomCode);
  const me = room?.players.get(s.playerId);
  if (!room || !me) return err(ws, 'no_session', 'Not in a game.');
  const rd = room.roundData;

  switch (msg.t) {
    /**
     * "I think I've gone stale — send me where we actually are."
     *
     * A phone that sleeps, a half-open socket, or a dropped broadcast leaves a
     * player frozen on a screen the rest of the room has moved past. The socket
     * looks fine, so reconnect logic never fires. This lets the client pull
     * instead of waiting to be pushed.
     */
    case 'resync': {
      send(ws, { t: 'state', state: viewFor(room, me.id) });
      return;
    }

    case 'settings': {
      if (room.hostId !== me.id || room.phase !== 'lobby') return;
      const cats = sanitizeCategories(msg.categories);
      if (cats) room.settings.categories = cats;
      if (Number.isInteger(msg.rounds) && msg.rounds >= 3 && msg.rounds <= 12)
        room.settings.rounds = msg.rounds;
      if (typeof msg.specialRounds === 'boolean') room.settings.specialRounds = msg.specialRounds;
      room.version += 1;
      broadcast(room);
      return;
    }

    case 'start': {
      if (room.hostId !== me.id) return;
      if (room.phase !== 'lobby') return;
      const n = allPlayers(room).filter((p) => p.connected).length;
      if (n < MIN_PLAYERS)
        return err(ws, 'too_few', `You need at least ${MIN_PLAYERS} players.`);
      startGame(room);
      scheduleAdvance(room);
      broadcast(room);
      return;
    }

    case 'answer': {
      if (room.phase !== 'question' || !rd) return;
      if (!rd.participants.includes(me.id)) return;
      if (rd.answers.has(me.id)) return;
      const text = String(msg.text ?? '').replace(/\s+/g, ' ').trim().slice(0, ANSWER_MAX);
      if (!text) return err(ws, 'empty', 'Type something first.');
      rd.answers.set(me.id, text);
      room.version += 1;
      maybeSkipAhead(room);
      broadcast(room);
      return;
    }

    case 'vote': {
      if (room.phase !== 'voting' || !rd) return;
      if (!rd.participants.includes(me.id)) return;
      if (rd.votes.has(me.id)) return; // one vote, final
      const target = String(msg.target ?? '');
      if (target === me.id) return err(ws, 'self_vote', "You can't side-eye yourself.");
      if (!rd.participants.includes(target)) return err(ws, 'bad_target', 'Not in this round.');
      rd.votes.set(me.id, target);
      room.version += 1;
      maybeSkipAhead(room);
      broadcast(room);
      return;
    }

    case 'oddGuess': {
      if (room.phase !== 'odd_guess' || !rd) return;
      if (!rd.oddIds.includes(me.id)) return;
      if (rd.oddGuesses.has(me.id)) return;
      const i = Number(msg.index);
      if (!Number.isInteger(i) || i < 0 || i >= rd.guessOptions.length) return;
      rd.oddGuesses.set(me.id, i);
      room.version += 1;
      maybeSkipAhead(room);
      broadcast(room);
      return;
    }

    case 'advance': {
      // Host nudge: skip the rest of a waiting/reading phase.
      if (room.hostId !== me.id) return;
      const skippable = [
        'round_intro', 'reveal_answers', 'discussion', 'reveal_votes',
        'reveal_identity', 'reveal_question', 'scoreboard',
      ];
      if (!skippable.includes(room.phase)) return;
      advance(room);
      return;
    }

    case 'skipQuestion': {
      // Host bails on an unusable prompt during the answer phase.
      if (room.hostId !== me.id || room.phase !== 'question' || !rd) return;
      toast(room, 'Host skipped that question.');
      room.round -= 1;
      room.roundData = null;
      clearTimer(room);
      nextRound(room);
      scheduleAdvance(room);
      broadcast(room);
      return;
    }

    case 'playAgain': {
      if (room.hostId !== me.id || room.phase !== 'final') return;
      clearTimer(room);
      resetToLobby(room);
      broadcast(room);
      return;
    }

    case 'kick': {
      if (room.hostId !== me.id) return;
      const target = room.players.get(String(msg.playerId ?? ''));
      if (!target || target.id === me.id) return;
      for (const [otherWs, os] of [...sessions]) {
        if (os.playerId === target.id) {
          send(otherWs, { t: 'error', code: 'kicked', message: 'You were removed from the room.' });
          sessions.delete(otherWs);
          try { otherWs.close(); } catch { /* already gone */ }
        }
      }
      room.players.delete(target.id);
      room.order = room.order.filter((id) => id !== target.id);
      if (rd) {
        rd.participants = rd.participants.filter((id) => id !== target.id);
        rd.oddIds = rd.oddIds.filter((id) => id !== target.id);
        rd.revealOrder = rd.revealOrder.filter((id) => id !== target.id);
        rd.answers.delete(target.id);
        rd.votes.delete(target.id);
        maybeSkipAhead(room);
      }
      toast(room, `${target.name} was removed.`);
      broadcast(room);
      return;
    }

    case 'leave': {
      sessions.delete(ws);
      room.players.delete(me.id);
      room.order = room.order.filter((id) => id !== me.id);
      if (rd) {
        rd.participants = rd.participants.filter((id) => id !== me.id);
        rd.revealOrder = rd.revealOrder.filter((id) => id !== me.id);
      }
      reassignHostIfNeeded(room);
      broadcast(room);
      return;
    }

  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;
    try {
      handle(ws, msg);
    } catch (e) {
      console.error('handler error', msg.t, e);
      err(ws, 'server', 'Something went wrong.');
    }
  });
  ws.on('close', () => detach(ws));
  ws.on('error', () => detach(ws));
});

// Heartbeat. Two missed pongs (~60s) before we hang up — a phone that briefly
// backgrounds itself should not lose its seat.
setInterval(() => {
  for (const ws of wss.clients) {
    ws.misses = (ws.misses ?? 0) + (ws.isAlive === false ? 1 : 0);
    if (ws.misses >= 2) {
      const s = sessions.get(ws);
      console.warn(`[heartbeat] hanging up on ${s?.playerId ?? 'unknown'} in ${s?.roomCode ?? '—'}`);
      try { ws.terminate(); } catch { /* noop */ }
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* noop */ }
  }
}, 30000).unref?.();

// Reap dead rooms.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const live = allPlayers(room).some((p) => p.connected);
    const idle = now - Math.max(room.createdAt, ...allPlayers(room).map((p) => p.lastSeen), 0);
    if (!live && idle > ROOM_TTL) {
      if (room.timer) clearTimeout(room.timer);
      rooms.delete(code);
    }
  }
}, 60000).unref?.();

/* ─────────────────────────────── http ─────────────────────────────── */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, players: sessions.size });
});

app.get('/api/room/:code', (req, res) => {
  const room = rooms.get(String(req.params.code).toUpperCase());
  if (!room) return res.status(404).json({ exists: false });
  res.json({
    exists: true,
    players: allPlayers(room).length,
    phase: room.phase,
    categories: room.settings.categories,
  });
});

/*
 * Serving the client is optional. In the all-in-one deploy this process hands
 * out the built app; in a split deploy (static host out front) there is no
 * client/dist here at all, and that is fine — say so plainly instead of
 * throwing ENOENT at every request.
 */
const dist = path.join(__dirname, '..', 'client', 'dist');
const hasClient = fs.existsSync(path.join(dist, 'index.html'));

if (hasClient) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('*', (_req, res) =>
    res
      .status(200)
      .type('text/plain')
      .send('SIDE EYE game server. The client is hosted separately — point it here with VITE_SERVER_URL.')
  );
}

server.listen(PORT, () => {
  console.log(`👀  SIDE EYE running on http://localhost:${PORT}`);
});

export { rooms, app, server };
