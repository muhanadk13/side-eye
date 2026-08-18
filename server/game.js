/**
 * SIDE EYE — authoritative game engine.
 *
 * Hard rule: hidden information never leaves this file for a client that
 * shouldn't have it. `viewFor(room, playerId)` is the ONLY way state reaches a
 * client, and it is built per-player from scratch every time.
 */

import { poolForCategories, guessOptionsFor } from './questions.js';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 10;
export const ANSWER_MAX = 40;
export const NAME_MAX = 12;

/**
 * Global speed multiplier. Tests run the whole 7-round loop in seconds by
 * setting SIDE_EYE_SPEED=0.02; production leaves it at 1.
 */
export const SPEED = Math.max(0.005, Number(process.env.SIDE_EYE_SPEED) || 1);

/** Phase durations in ms. Tuned for energy without feeling rushed. */
export const TIMING = {
  round_intro: 2600,
  question: 22000,
  reveal_answers: 0, // computed: 900ms per player + hold
  discussion: 50000,
  voting: 16000,
  odd_guess: 11000,
  reveal_votes: 7000,
  reveal_identity: 5200,
  reveal_question: 11000,
  scoreboard: 9000,
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

export function makeCode(taken) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => ALPHABET[(Math.random() * ALPHABET.length) | 0]).join('');
  } while (taken.has(code));
  return code;
}

export function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const rng = Math.random;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────────────── room ─────────────────────────────── */

export function createRoom(code) {
  return {
    code,
    createdAt: Date.now(),
    hostId: null,
    players: new Map(), // id -> player
    order: [], // stable seating order
    // categories: [] means random — draw from the whole library.
    settings: { categories: [], rounds: 7, specialRounds: true },
    phase: 'lobby',
    phaseEndsAt: null,
    timer: null,
    round: 0,
    roundData: null,
    usedPairIds: new Set(),
    oddCounts: new Map(),
    log: [], // per-round summaries for the final screen
    gameNumber: 0,
    plan: null, // special-round schedule for the current game
    version: 0,
  };
}

export function makePlayer(name, { spectator = false } = {}) {
  return {
    id: makeId(),
    token: makeId() + makeId(),
    name,
    connected: true,
    lastSeen: Date.now(),
    score: 0,
    spectator, // joined mid-game; plays from next round
    stats: {
      votesReceived: 0,
      votesReceivedInnocent: 0,
      correctVotes: 0,
      votesCast: 0,
      timesOdd: 0,
      timesOddSurvived: 0,
      timesOddGuessedRight: 0,
      roundsPlayed: 0,
    },
  };
}

export const activePlayers = (room) =>
  room.order.map((id) => room.players.get(id)).filter((p) => p && !p.spectator);

export const allPlayers = (room) => room.order.map((id) => room.players.get(id)).filter(Boolean);

/* ──────────────────────── special-round planning ──────────────────────── */

/**
 * Decide up-front which rounds are special. ~1 special round per 7 — the core
 * mechanic has to stay the thing people recognise.
 */
function buildPlan(room) {
  const n = room.settings.rounds;
  const players = activePlayers(room).length;
  const plan = new Map();
  if (!room.settings.specialRounds || n < 4) return plan;

  // Twist lands mid-late: round 4, 5 or 6 of a 7-round game.
  const candidates = [];
  for (let r = Math.max(3, Math.floor(n * 0.55)); r <= Math.min(n - 1, Math.ceil(n * 0.86)); r++) {
    candidates.push(r);
  }
  if (!candidates.length) return plan;
  const slot = candidates[(rng() * candidates.length) | 0];

  const options = ['reverse', 'reverse'];
  if (players >= 7) options.push('double');
  if (players >= 5) options.push('none'); // paranoia round, used sparingly
  const type = options[(rng() * options.length) | 0];
  plan.set(slot, type);
  return plan;
}

/* ──────────────────────── question selection ──────────────────────── */

function pickPair(room, { wantReverse = false } = {}) {
  let pool = poolForCategories(room.settings.categories).filter((p) => !room.usedPairIds.has(p.id));
  if (!pool.length) {
    room.usedPairIds.clear();
    pool = poolForCategories(room.settings.categories);
  }

  const isReverse = (p) => p.type === 'reverse';
  let candidates = wantReverse ? pool.filter(isReverse) : pool.filter((p) => !isReverse(p));
  if (!candidates.length) candidates = pool;

  // Pace spice: gentle early, bolder late.
  const progress = room.round / Math.max(1, room.settings.rounds);
  const target = progress < 0.35 ? 1 : progress < 0.75 ? 2 : 3;
  const ranked = candidates
    .map((p) => ({ p, d: Math.abs((p.spice ?? 2) - target) + rng() * 1.2 }))
    .sort((x, y) => x.d - y.d);

  const pick = ranked[0].p;
  room.usedPairIds.add(pick.id);
  return pick;
}

/** Fair odd rotation: always choose from the least-often-odd players. */
function pickOdd(room, participants, count) {
  const chosen = [];
  const pool = [...participants];
  for (let k = 0; k < count && pool.length; k++) {
    let min = Infinity;
    for (const id of pool) min = Math.min(min, room.oddCounts.get(id) ?? 0);
    const tier = pool.filter((id) => (room.oddCounts.get(id) ?? 0) === min);
    const id = tier[(rng() * tier.length) | 0];
    chosen.push(id);
    pool.splice(pool.indexOf(id), 1);
    room.oddCounts.set(id, (room.oddCounts.get(id) ?? 0) + 1);
  }
  return chosen;
}

/* ──────────────────────────── round lifecycle ──────────────────────────── */

export function startGame(room) {
  // Promote everyone waiting.
  for (const p of room.players.values()) p.spectator = false;
  for (const p of room.players.values()) {
    p.score = 0;
    p.stats = makePlayer('x').stats;
  }
  room.round = 0;
  room.log = [];
  room.oddCounts = new Map();
  room.usedPairIds = new Set();
  room.gameNumber += 1;
  room.plan = buildPlan(room);
  nextRound(room);
}

export function nextRound(room) {
  // Promote anyone who joined mid-game.
  for (const p of room.players.values()) {
    if (p.spectator) {
      p.spectator = false;
      p.score = 0;
    }
  }

  room.round += 1;
  if (room.round > room.settings.rounds) return finishGame(room);

  const participants = activePlayers(room)
    .filter((p) => p.connected)
    .map((p) => p.id);

  if (participants.length < MIN_PLAYERS) {
    // Not enough humans left to run a fair round.
    return finishGame(room, 'not-enough-players');
  }

  let type = room.plan?.get(room.round) ?? 'standard';
  if (type === 'double' && participants.length < 7) type = 'standard';
  if (type === 'none' && participants.length < 5) type = 'standard';

  const pair = pickPair(room, { wantReverse: type === 'reverse' });
  // Narrow category picks may hold no reverse-framed pairs at all. Announcing a
  // REVERSE round and then serving an ordinary pair would be a lie, so drop back
  // to a normal round instead.
  if (type === 'reverse' && pair.type !== 'reverse') type = 'standard';

  const oddIds = type === 'none' ? [] : pickOdd(room, participants, type === 'double' ? 2 : 1);
  const guess = guessOptionsFor(pair, rng);

  room.roundData = {
    index: room.round,
    type,
    pairId: pair.id,
    majorityQ: pair.a,
    oddQ: type === 'none' ? pair.a : pair.b,
    personal: !!pair.personal,
    participants,
    oddIds,
    answers: new Map(),
    votes: new Map(),
    oddGuesses: new Map(),
    guessOptions: guess.options,
    guessCorrectIndex: guess.correctIndex,
    revealOrder: shuffle(participants),
    results: null,
  };

  for (const id of participants) {
    const p = room.players.get(id);
    if (p) p.stats.roundsPlayed += 1;
  }

  setPhase(room, 'round_intro');
}

export function setPhase(room, phase) {
  room.phase = phase;
  room.version += 1;
  let ms = TIMING[phase] ?? 5000;

  if (phase === 'reveal_answers') {
    const n = room.roundData?.participants.length ?? 4;
    ms = 1100 + n * 950 + 3200;
  }
  if (phase === 'scoreboard' && room.round === 1) ms = 12000;
  if (phase === 'round_intro' && room.round === 1) {
    // Round one also carries the three-line explainer. Give people time to read it.
    ms = 5200;
  }
  if (phase === 'odd_guess' && room.roundData) {
    // Nobody to ask (NO SIDE EYE round, or the odd player vanished) — skip fast.
    const present = room.roundData.oddIds.filter((id) => room.players.get(id)?.connected);
    if (!present.length) ms = 1400;
  }
  ms = Math.max(60, Math.round(ms * SPEED));
  room.phaseTotal = ms;
  room.phaseEndsAt = Date.now() + ms;
  return ms;
}

/** Everyone who still needs to act this phase. */
export function pendingPlayers(room) {
  const rd = room.roundData;
  if (!rd) return [];
  if (room.phase === 'question') {
    return rd.participants.filter(
      (id) => !rd.answers.has(id) && room.players.get(id)?.connected
    );
  }
  if (room.phase === 'voting') {
    return rd.participants.filter((id) => !rd.votes.has(id) && room.players.get(id)?.connected);
  }
  if (room.phase === 'odd_guess') {
    return rd.oddIds.filter((id) => !rd.oddGuesses.has(id) && room.players.get(id)?.connected);
  }
  return [];
}

/* ──────────────────────────────── scoring ──────────────────────────────── */

export function computeResults(room) {
  const rd = room.roundData;
  const tally = new Map(); // targetId -> count
  const voters = new Map(); // targetId -> [voterId]

  for (const [voter, target] of rd.votes) {
    if (!rd.participants.includes(target)) continue;
    tally.set(target, (tally.get(target) ?? 0) + 1);
    if (!voters.has(target)) voters.set(target, []);
    voters.get(target).push(voter);
  }

  const maxVotes = Math.max(0, ...tally.values());
  const topVoted = [...tally.entries()].filter(([, c]) => c === maxVotes && c > 0).map(([id]) => id);

  const gains = new Map(rd.participants.map((id) => [id, 0]));
  const add = (id, n) => gains.set(id, (gains.get(id) ?? 0) + n);

  const isOdd = (id) => rd.oddIds.includes(id);

  if (rd.type === 'none') {
    // Nobody had SIDE EYE. Nobody could be right — everyone survived the paranoia.
    for (const id of rd.participants) add(id, 1);
  } else {
    // +1 for each correct accusation.
    for (const [voter, target] of rd.votes) {
      if (isOdd(target)) {
        add(voter, 1);
        const p = room.players.get(voter);
        if (p) p.stats.correctVotes += 1;
      }
    }
    // +2 for each odd player who avoided being top-voted (ties count as caught).
    for (const oddId of rd.oddIds) {
      const caught = topVoted.includes(oddId);
      if (!caught) {
        add(oddId, 2);
        const p = room.players.get(oddId);
        if (p) p.stats.timesOddSurvived += 1;
      }
    }
    // +1 bonus for the odd player naming the majority question.
    for (const oddId of rd.oddIds) {
      if (rd.oddGuesses.get(oddId) === rd.guessCorrectIndex) {
        add(oddId, 1);
        const p = room.players.get(oddId);
        if (p) p.stats.timesOddGuessedRight += 1;
      }
    }
  }

  // Stats
  for (const id of rd.participants) {
    const p = room.players.get(id);
    if (!p) continue;
    const received = tally.get(id) ?? 0;
    p.stats.votesReceived += received;
    if (!isOdd(id)) p.stats.votesReceivedInnocent += received;
    if (isOdd(id)) p.stats.timesOdd += 1;
    if (rd.votes.has(id)) p.stats.votesCast += 1;
  }

  for (const [id, g] of gains) {
    const p = room.players.get(id);
    if (p) p.score += g;
  }

  const caughtAll = rd.oddIds.length > 0 && rd.oddIds.every((id) => topVoted.includes(id));
  const caughtAny = rd.oddIds.some((id) => topVoted.includes(id));

  rd.results = {
    tally: [...tally.entries()].map(([id, count]) => ({
      id,
      count,
      voters: voters.get(id) ?? [],
    })),
    maxVotes,
    topVoted,
    gains: [...gains.entries()].map(([id, points]) => ({ id, points })),
    caught: caughtAll,
    caughtAny,
    noOdd: rd.type === 'none',
    oddGuessCorrect: rd.oddIds.map((id) => ({
      id,
      correct: rd.oddGuesses.get(id) === rd.guessCorrectIndex,
      answered: rd.oddGuesses.has(id),
    })),
  };

  room.log.push({
    round: rd.index,
    type: rd.type,
    majorityQ: rd.majorityQ,
    oddQ: rd.oddQ,
    oddIds: [...rd.oddIds],
    caught: caughtAll,
  });

  return rd.results;
}

/* ──────────────────────────────── awards ──────────────────────────────── */

function pct(n, d) {
  return d > 0 ? n / d : -1;
}

export function computeAwards(room) {
  const players = allPlayers(room).filter((p) => p.stats.roundsPlayed > 0);
  if (players.length < 2) return [];

  const awards = [];
  const used = new Set();

  const claim = (emoji, title, blurb, winner, detail) => {
    if (!winner || used.has(winner.id)) return;
    used.add(winner.id);
    awards.push({ emoji, title, blurb, playerId: winner.id, name: winner.name, detail });
  };

  const best = (fn, guard) => {
    let top = null;
    let topV = -Infinity;
    for (const p of players) {
      if (used.has(p.id)) continue;
      if (guard && !guard(p)) continue;
      const v = fn(p);
      if (v > topV) {
        topV = v;
        top = p;
      }
    }
    return top && topV > -Infinity ? { p: top, v: topV } : null;
  };

  const det = (fn, guard, ...args) => {
    const r = best(fn, guard);
    return r;
  };

  let r;
  r = det((p) => pct(p.stats.correctVotes, p.stats.votesCast), (p) => p.stats.votesCast >= 2);
  if (r && r.v > 0)
    claim('🎯', 'BEST DETECTIVE', 'Sniffed out the odd one most often',
      r.p, `${r.p.stats.correctVotes}/${r.p.stats.votesCast} correct`);

  r = det((p) => pct(p.stats.timesOddSurvived, p.stats.timesOdd), (p) => p.stats.timesOdd >= 1);
  if (r && r.v > 0)
    claim('🐍', 'BEST LIAR', 'Had SIDE EYE and walked away clean',
      r.p, `got away with it ${r.p.stats.timesOddSurvived}/${r.p.stats.timesOdd}`);

  r = det((p) => p.stats.votesReceivedInnocent, null);
  if (r && r.v > 0)
    claim('🤨', 'MOST SUSPICIOUS', 'Accused constantly while completely innocent',
      r.p, `${r.v} votes while innocent`);

  r = det((p) => p.stats.votesReceived, null);
  if (r && r.v > 0)
    claim('👀', 'SIDE EYE MAGNET', 'The group just could not let it go',
      r.p, `${r.v} total votes`);

  r = det((p) => -p.stats.votesReceived, null);
  if (r)
    claim('🕵️', 'UNDER THE RADAR', 'Barely got looked at all night',
      r.p, `${r.p.stats.votesReceived} total votes`);

  r = det((p) => p.stats.timesOddGuessedRight, null);
  if (r && r.v > 0)
    claim('🧠', 'MIND READER', 'Guessed what everyone else was answering',
      r.p, `${r.v}× correct`);

  return awards.slice(0, 5);
}

export function finishGame(room, reason = null) {
  room.phase = 'final';
  room.phaseEndsAt = null;
  room.version += 1;
  room.finalReason = reason;
  room.awards = computeAwards(room);
  room.roundData = null;
}

export function resetToLobby(room) {
  room.phase = 'lobby';
  room.phaseEndsAt = null;
  room.round = 0;
  room.roundData = null;
  room.awards = null;
  room.finalReason = null;
  room.version += 1;
  for (const p of room.players.values()) p.spectator = false;
}

/* ─────────────────────────── per-player view ─────────────────────────── */

const REVEALED = new Set([
  'reveal_votes',
  'reveal_identity',
  'reveal_question',
  'scoreboard',
  'final',
]);

export function viewFor(room, playerId) {
  const me = room.players.get(playerId);
  const rd = room.roundData;
  const revealed = REVEALED.has(room.phase);

  const view = {
    code: room.code,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    phaseTotal: room.phaseTotal ?? null,
    serverNow: Date.now(),
    round: room.round,
    totalRounds: room.settings.rounds,
    settings: room.settings,
    hostId: room.hostId,
    youAreHost: room.hostId === playerId,
    you: me
      ? { id: me.id, name: me.name, score: me.score, spectator: me.spectator }
      : null,
    players: allPlayers(room).map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      spectator: p.spectator,
      isHost: p.id === room.hostId,
    })),
    version: room.version,
  };

  if (!rd) {
    if (room.phase === 'final') {
      view.final = {
        standings: allPlayers(room)
          .filter((p) => p.stats.roundsPlayed > 0 || !p.spectator)
          .map((p) => ({ id: p.id, name: p.name, score: p.score }))
          .sort((a, b) => b.score - a.score),
        awards: room.awards ?? [],
        rounds: room.log,
        reason: room.finalReason ?? null,
      };
    }
    return view;
  }

  const inRound = rd.participants.includes(playerId);
  const iAmOdd = rd.oddIds.includes(playerId);

  view.round_type_public = revealed ? rd.type : null;
  view.inRound = inRound;
  view.answeredCount = rd.answers.size;
  view.participantCount = rd.participants.length;
  view.answeredIds = [...rd.answers.keys()];
  view.votedIds = [...rd.votes.keys()];
  view.personal = rd.personal;

  // YOUR question — and only yours.
  if (inRound && ['question', 'reveal_answers', 'discussion', 'voting', 'odd_guess'].includes(room.phase)) {
    view.myQuestion = iAmOdd ? rd.oddQ : rd.majorityQ;
    view.myAnswer = rd.answers.get(playerId) ?? null;
  }

  if (room.phase === 'reveal_answers' || room.phase === 'discussion' || room.phase === 'voting' || revealed) {
    view.answers = rd.revealOrder
      .filter((id) => rd.answers.has(id))
      .map((id) => ({
        playerId: id,
        name: room.players.get(id)?.name ?? '—',
        answer: rd.answers.get(id),
      }));
    view.missingAnswers = rd.participants
      .filter((id) => !rd.answers.has(id))
      .map((id) => ({ playerId: id, name: room.players.get(id)?.name ?? '—' }));
  }

  if (room.phase === 'voting') {
    view.myVote = rd.votes.get(playerId) ?? null;
  }

  // The bonus guess is shown ONLY to the odd player. Everyone else gets a
  // neutral "votes are locked" screen so this step never leaks identity.
  if (room.phase === 'odd_guess') {
    view.myVote = rd.votes.get(playerId) ?? null;
    if (iAmOdd) {
      view.oddGuess = {
        options: rd.guessOptions,
        chosen: rd.oddGuesses.get(playerId) ?? null,
      };
    }
  }

  if (revealed && rd.results) {
    view.results = {
      ...rd.results,
      oddIds: rd.oddIds,
      oddNames: rd.oddIds.map((id) => room.players.get(id)?.name ?? '—'),
      majorityQ: rd.majorityQ,
      oddQ: rd.oddQ,
      type: rd.type,
      oddAnswers: rd.oddIds.map((id) => ({
        id,
        name: room.players.get(id)?.name ?? '—',
        answer: rd.answers.get(id) ?? null,
      })),
      guessOptions: rd.guessOptions,
      guessCorrectIndex: rd.guessCorrectIndex,
      youWereOdd: iAmOdd,
      yourGain: rd.results.gains.find((g) => g.id === playerId)?.points ?? 0,
    };
  }

  return view;
}
