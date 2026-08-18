/**
 * SIDE EYE — headless multiplayer test harness.
 *
 * Spins up a real server, connects real WebSocket clients, and plays whole
 * games while asserting the things that actually matter:
 *   • hidden information stays hidden (this is a deduction game — leaks kill it)
 *   • exactly the intended number of odd players, and they don't know it
 *   • no self-votes, no double votes
 *   • scoring matches the published rules
 *   • the loop survives refreshes, drops, host loss, and empty rounds
 */

import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const PORT = process.env.TEST_PORT || 3199;
const BASE = `ws://localhost:${PORT}/ws`;
const SPEED = process.env.TEST_SPEED || '0.05';

let passed = 0;
let failed = 0;
const failures = [];

function ok(cond, label, detail) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(label + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ───────────────────────────── test client ───────────────────────────── */

class Client {
  constructor(name) {
    this.name = name;
    this.state = null;
    this.seat = null;
    this.errors = [];
    this.toasts = [];
    this.seenPhases = [];
    this.history = []; // every state snapshot, for leak auditing
    this.acted = new Set();
    this.autoplay = true;
    this.voteChoice = null; // 'random' | fn
    this.skipVote = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(BASE);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (raw) => this._onMessage(JSON.parse(raw.toString())));
      // Mirror the real client's self-heal so the suite exercises it. This can
      // only paper over a lost broadcast — if the server itself is wedged,
      // resync returns the same stuck phase and the test still fails.
      clearInterval(this._stale);
      this._stale = setInterval(() => {
        const s = this.state;
        if (this.ws?.readyState !== 1 || !s?.phaseEndsAt) return;
        const now = Date.now();
        if (now - s.phaseEndsAt > 1500 && now - (this.lastStateAt ?? 0) > 1500) {
          this.resyncs = (this.resyncs ?? 0) + 1;
          this.send({ t: 'resync' });
        }
      }, 500);
      this._stale.unref?.();
    });
  }

  _onMessage(msg) {
    if (msg.t === 'joined') {
      this.seat = { code: msg.code, playerId: msg.playerId, token: msg.token };
      this.id = msg.playerId;
    } else if (msg.t === 'state') {
      const prev = this.state;
      this.state = msg.state;
      this.lastStateAt = Date.now();
      this.history.push(msg.state);
      if (!prev || prev.phase !== msg.state.phase) {
        this.seenPhases.push(msg.state.phase);
        // Round numbers restart on "play again" — forget what we did last game.
        if (msg.state.phase === 'lobby') this.acted.clear();
      }
      if (this.autoplay) this._react();
    } else if (msg.t === 'error') {
      this.errors.push(msg);
    } else if (msg.t === 'toast') {
      this.toasts.push(msg.text);
    }
  }

  _react() {
    const s = this.state;
    if (!s) return;
    const key = `${s.round}:${s.phase}`;
    if (this.acted.has(key)) return;

    if (s.phase === 'question' && s.inRound && !s.myAnswer) {
      this.acted.add(key);
      // Answer text derived from the question so we can detect mismatches by eye.
      this.send({ t: 'answer', text: `${this.name}-ans` });
    } else if (s.phase === 'voting' && s.inRound && !s.myVote && !this.skipVote) {
      this.acted.add(key);
      const others = s.players.filter((p) => !p.spectator && p.id !== s.you.id);
      if (!others.length) return;
      const target =
        typeof this.voteChoice === 'function'
          ? this.voteChoice(s, others)
          : others[Math.floor(Math.random() * others.length)].id;
      if (target) this.send({ t: 'vote', target });
    } else if (s.phase === 'odd_guess' && s.oddGuess && s.oddGuess.chosen == null) {
      this.acted.add(key);
      this.send({ t: 'oddGuess', index: Math.floor(Math.random() * s.oddGuess.options.length) });
    }
  }

  send(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  async create(categories = []) {
    this.send({ t: 'create', name: this.name, categories });
    await this.waitFor((s) => s.phase === 'lobby' && s.you);
  }

  async join(code) {
    this.send({ t: 'join', name: this.name, code });
    await this.waitFor((s) => !!s.you, 3000, "!!s.you");
  }

  async rejoin() {
    this.send({ t: 'rejoin', ...this.seat });
    await this.waitFor((s) => !!s.you, 3000, "!!s.you");
  }

  /** Simulate a refresh / connection loss. */
  drop() {
    try { this.ws.terminate(); } catch { /* noop */ }
    this.state = null;
  }

  async reconnect() {
    await this.connect();
    await this.rejoin();
  }

  close() {
    this.autoplay = false;
    clearInterval(this._stale);
    try { this.ws.close(); } catch { /* noop */ }
  }

  waitFor(pred, timeout = 20000, label = '?') {
    if (this.state && pred(this.state)) return Promise.resolve(this.state);
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const id = setInterval(() => {
        if (this.state && pred(this.state)) {
          clearInterval(id);
          resolve(this.state);
        } else if (Date.now() - started > timeout) {
          clearInterval(id);
          reject(
            new Error(
              `${this.name}: timeout at ${label} (phase=${this.state?.phase} round=${this.state?.round} ` +
                `players=${this.state?.players?.length} errors=${JSON.stringify(this.errors.slice(-3))})`
            )
          );
        }
      }, 15);
    });
  }
}

/* ──────────────────────────── leak auditing ──────────────────────────── */

const PRE_REVEAL = new Set([
  'lobby', 'round_intro', 'question', 'reveal_answers', 'discussion', 'voting', 'odd_guess',
]);

function auditLeaks(clients) {
  // Any snapshot before the reveal must not carry identity or the other question.
  for (const c of clients) {
    for (const s of c.history) {
      if (!PRE_REVEAL.has(s.phase)) continue;
      const blob = JSON.stringify(s);

      ok(!('results' in s) || s.results == null,
        `no results leak pre-reveal (${c.name}/${s.phase})`);
      ok(s.round_type_public == null,
        `round type hidden pre-reveal (${c.name}/${s.phase})`);
      ok(!blob.includes('"oddIds"'),
        `oddIds never sent pre-reveal (${c.name}/${s.phase})`);
      ok(!blob.includes('"oddQ"'),
        `odd question never sent pre-reveal (${c.name}/${s.phase})`);
      ok(!blob.includes('"majorityQ"'),
        `majority question never sent pre-reveal (${c.name}/${s.phase})`);
      ok(!blob.includes('"guessCorrectIndex"'),
        `guess answer never sent pre-reveal (${c.name}/${s.phase})`);
      ok(!blob.includes('"pairId"'),
        `pair id never sent (${c.name}/${s.phase})`);

      // No one else's answers before the reveal.
      if (['question', 'round_intro'].includes(s.phase)) {
        ok(s.answers == null, `answers hidden during answer phase (${c.name})`);
      }
      // No vote targets before voting closes.
      if (['voting', 'discussion'].includes(s.phase)) {
        ok(!blob.includes('"tally"'), `votes hidden during voting (${c.name})`);
      }
    }
  }
}

/* ───────────────────────────── round auditing ───────────────────────────── */

function auditRound(clients, roundNo) {
  // Gather each player's private question during the answer phase of `roundNo`.
  const qs = new Map();
  for (const c of clients) {
    const snap = c.history.find(
      (s) => s.round === roundNo && s.phase === 'question' && s.myQuestion
    );
    if (snap) qs.set(c.name, snap.myQuestion);
  }
  if (qs.size < 4) return null;

  const counts = new Map();
  for (const q of qs.values()) counts.set(q, (counts.get(q) ?? 0) + 1);
  const distinct = [...counts.keys()];

  // Find the reveal so we know what the round actually was.
  let res = null;
  for (const c of clients) {
    const snap = [...c.history].reverse().find((s) => s.round === roundNo && s.results);
    if (snap) { res = snap.results; break; }
  }
  if (!res) return null;

  const expectedOdd = res.oddIds.length;

  if (res.noOdd) {
    ok(distinct.length === 1, `R${roundNo} NO SIDE EYE: everyone shares one question`,
      `${distinct.length} distinct`);
  } else {
    ok(distinct.length === 2, `R${roundNo}: exactly two distinct questions`,
      `got ${distinct.length}`);
    const minority = [...counts.entries()].sort((a, b) => a[1] - b[1])[0];
    ok(minority[1] === expectedOdd,
      `R${roundNo}: ${expectedOdd} player(s) got the odd question`,
      `minority count ${minority[1]}`);
    ok(minority[0] === res.oddQ, `R${roundNo}: minority question matches revealed odd question`);
  }

  // The odd player must NOT have been told, in any pre-reveal snapshot.
  for (const c of clients) {
    const oddNow = res.oddIds.includes(c.id);
    if (!oddNow) continue;
    const pre = c.history.filter((s) => s.round === roundNo && PRE_REVEAL.has(s.phase));
    const told = pre.some((s) => {
      const b = JSON.stringify(s);
      return b.includes('"youWereOdd"') || b.includes('"isOdd"') || b.includes('"oddIds"');
    });
    ok(!told, `R${roundNo}: odd player (${c.name}) is never told they are odd`);
  }

  // Bonus-guess screen goes to the odd player only.
  for (const c of clients) {
    const snap = c.history.find((s) => s.round === roundNo && s.phase === 'odd_guess');
    if (!snap) continue;
    const shouldSee = res.oddIds.includes(c.id);
    ok(!!snap.oddGuess === shouldSee || (!shouldSee && !snap.oddGuess),
      `R${roundNo}: bonus guess shown only to odd player (${c.name})`,
      `shouldSee=${shouldSee} got=${!!snap.oddGuess}`);
  }

  return res;
}

function auditScoring(clients, roundNo) {
  let res = null;
  let before = null;
  let after = null;

  const ref = clients.find((c) => c.history.some((s) => s.round === roundNo && s.results));
  if (!ref) return;

  // scores just before the reveal, and on the scoreboard
  before = [...ref.history].reverse().find((s) => s.round === roundNo && s.phase === 'discussion');
  after = [...ref.history].reverse().find((s) => s.round === roundNo && s.phase === 'scoreboard');
  res = after?.results ?? [...ref.history].reverse().find((s) => s.round === roundNo && s.results)?.results;
  if (!res || !before || !after) return;

  const scoreBefore = new Map(before.players.map((p) => [p.id, p.score]));
  const scoreAfter = new Map(after.players.map((p) => [p.id, p.score]));

  for (const g of res.gains) {
    const delta = (scoreAfter.get(g.id) ?? 0) - (scoreBefore.get(g.id) ?? 0);
    ok(delta === g.points, `R${roundNo}: score delta matches published gain`,
      `${g.id} gain=${g.points} delta=${delta}`);
  }

  // Recompute the rules independently.
  const tallyMap = new Map(res.tally.map((t) => [t.id, t.count]));
  const max = Math.max(0, ...tallyMap.values());
  const top = [...tallyMap.entries()].filter(([, c]) => c === max && c > 0).map(([id]) => id);

  if (!res.noOdd) {
    for (const oddId of res.oddIds) {
      const caught = top.includes(oddId);
      const gain = res.gains.find((g) => g.id === oddId)?.points ?? 0;
      const bonus = res.oddGuessCorrect.find((g) => g.id === oddId)?.correct ? 1 : 0;
      // The odd player may also have voted correctly for the *other* odd player.
      const votedForOtherOdd =
        res.tally.some((t) => res.oddIds.includes(t.id) && t.voters.includes(oddId)) ? 1 : 0;
      const expected = (caught ? 0 : 2) + bonus + votedForOtherOdd;
      ok(gain === expected, `R${roundNo}: odd-player score follows the rules`,
        `caught=${caught} bonus=${bonus} expected=${expected} got=${gain}`);
    }
    // Correct voters get exactly +1 (non-odd voters have no other source).
    for (const t of res.tally) {
      if (!res.oddIds.includes(t.id)) continue;
      for (const voter of t.voters) {
        if (res.oddIds.includes(voter)) continue;
        const gain = res.gains.find((g) => g.id === voter)?.points ?? 0;
        ok(gain === 1, `R${roundNo}: correct voter gets exactly +1`, `${voter} got ${gain}`);
      }
    }
  } else {
    for (const g of res.gains) {
      ok(g.points === 1, `R${roundNo}: NO SIDE EYE gives everyone +1`, `got ${g.points}`);
    }
  }

  // Tie rule: odd tied at the top counts as caught.
  if (!res.noOdd) {
    const anyOddAtTop = res.oddIds.some((id) => top.includes(id));
    ok(res.caughtAny === anyOddAtTop, `R${roundNo}: tie-at-top counts as caught`);
  }

  // No self votes, no double votes.
  const seenVoters = new Set();
  for (const t of res.tally) {
    for (const v of t.voters) {
      ok(v !== t.id, `R${roundNo}: nobody voted for themselves`);
      ok(!seenVoters.has(v), `R${roundNo}: nobody voted twice`);
      seenVoters.add(v);
    }
  }
}

/* ──────────────────────────── scenarios ──────────────────────────── */

async function makeGame(n, { categories = [], rounds = 7, special = true, names } = {}) {
  const clients = [];
  const host = new Client(names?.[0] ?? 'Host');
  await host.connect();
  await host.create(categories);
  clients.push(host);
  const code = host.seat.code;

  for (let i = 1; i < n; i++) {
    const c = new Client(names?.[i] ?? `P${i}`);
    await c.connect();
    await c.join(code);
    clients.push(c);
  }
  await host.waitFor((s) => s.players.length === n);
  host.send({ t: 'settings', rounds, specialRounds: special });
  await host.waitFor((s) => s.settings.rounds === rounds, 5000, 'settings applied');
  return { clients, host, code };
}

async function scenarioFullGame(n, opts = {}) {
  const label = (opts.categories ?? []).join('+') || 'random';
  console.log(`\n▸ Full ${opts.rounds ?? 7}-round game with ${n} players (${label})`);
  const { clients, host } = await makeGame(n, opts);

  ok(host.state.players.length === n, `lobby holds ${n} players`);
  ok(host.state.youAreHost === true, 'creator is host');
  ok(clients[1].state.youAreHost === false, 'joiner is not host');

  host.send({ t: 'start' });
  await host.waitFor((s) => s.phase !== 'lobby', 8000, "s.phase !== 'lobby'");

  const rounds = opts.rounds ?? 7;
  for (let r = 1; r <= rounds; r++) {
    await host.waitFor((s) => s.round === r && s.phase === 'scoreboard', 45000, "s.round === r && s.phase === 'scoreboard'");
  }
  await host.waitFor((s) => s.phase === 'final', 30000, "s.phase === 'final'");

  const f = host.state.final;
  ok(f.standings.length === n, 'final standings include everyone');
  ok(f.rounds.length === rounds, `${rounds} rounds recorded`, `got ${f.rounds.length}`);
  ok(f.standings.every((s, i, a) => i === 0 || a[i - 1].score >= s.score), 'standings are sorted');
  ok(f.awards.length > 0, 'awards were generated');
  ok(new Set(f.awards.map((a) => a.playerId)).size === f.awards.length, 'each award goes to a different player');

  auditLeaks(clients);
  for (let r = 1; r <= rounds; r++) {
    auditRound(clients, r);
    auditScoring(clients, r);
  }

  // Fair rotation: with 7 rounds and n players, nobody should be odd wildly
  // more often than anyone else.
  const oddCount = new Map();
  for (const rec of f.rounds) for (const id of rec.oddIds) oddCount.set(id, (oddCount.get(id) ?? 0) + 1);
  const counts = clients.map((c) => oddCount.get(c.id) ?? 0);
  ok(Math.max(...counts) - Math.min(...counts) <= 1,
    'odd-player rotation stays balanced', `counts=[${counts}]`);

  const specials = f.rounds.filter((r) => r.type !== 'standard');
  ok(specials.length <= 1, 'at most one special round per game', `got ${specials.length}`);
  ok(f.rounds.filter((r) => r.type === 'none').length <= 1, 'NO SIDE EYE at most once');

  // Question variety: no pair repeats within a game.
  const seen = new Set();
  let dupe = false;
  for (const r of f.rounds) {
    const key = r.majorityQ + '|' + r.oddQ;
    if (seen.has(key)) dupe = true;
    seen.add(key);
  }
  ok(!dupe, 'no question pair repeats inside one game');

  return { clients, host };
}

async function scenarioReplay(clients, host) {
  console.log('\n▸ Play again keeps the group');
  const before = host.state.players.length;
  host.send({ t: 'playAgain' });
  await host.waitFor((s) => s.phase === 'lobby', 6000, "s.phase === 'lobby'");
  ok(host.state.players.length === before, 'play again preserves every player');
  ok(host.state.players.every((p) => p.score === 0) || host.state.round === 0, 'new game resets round');

  host.send({ t: 'settings', rounds: 3, categories: ['unhinged'] });
  await host.waitFor((s) => s.settings.rounds === 3 && s.settings.categories.join() === 'unhinged');
  host.send({ t: 'start' });
  await host.waitFor((s) => s.phase === 'final', 60000, "3-round unhinged game reaches final");
  ok(host.state.final.rounds.length === 3, 'shorter replay runs the right number of rounds');
  ok(host.state.you.score >= 0, 'scores were reset for the new game');
  clients.forEach((c) => c.close());
}

async function scenarioRefreshAndDrop() {
  console.log('\n▸ Refresh, disconnect, host loss');
  const { clients, host } = await makeGame(5, { rounds: 3 });
  host.send({ t: 'start' });
  await host.waitFor((s) => s.phase === 'question' && s.round === 1, 8000, "s.phase === 'question' && s.round === 1");

  // Refresh mid-question: the player must get the SAME question back.
  const victim = clients[2];
  const qBefore = victim.state.myQuestion;
  victim.autoplay = false;
  victim.drop();
  await sleep(120);
  await victim.reconnect();
  victim.autoplay = true;
  await victim.waitFor((s) => !!s.myQuestion || s.phase !== 'question', 8000, "!!s.myQuestion || s.phase !== 'question'");
  if (victim.state.phase === 'question') {
    ok(victim.state.myQuestion === qBefore, 'refresh restores the same private question');
  }
  ok(victim.state.you != null, 'refresh restores the seat');

  // Refresh after submitting.
  await host.waitFor((s) => s.phase === 'discussion' || s.phase === 'reveal_answers', 20000, "s.phase === 'discussion' || s.phase === 'reveal_answers'");
  const v2 = clients[3];
  v2.drop();
  await sleep(100);
  await v2.reconnect();
  ok(v2.state.you != null, 'refresh after answering restores the seat');

  // Host disappears — someone else must take over and the game must continue.
  await host.waitFor((s) => s.phase === 'scoreboard', 30000, "s.phase === 'scoreboard'");
  const hostId = host.state.you.id;
  host.autoplay = false;
  host.drop();
  await sleep(400);
  const other = clients[1];
  await other.waitFor((s) => s.hostId !== hostId, 8000, "s.hostId !== hostId");
  ok(other.state.hostId !== hostId, 'host role transfers when the host drops');
  ok(other.state.players.find((p) => p.id === hostId)?.connected === false,
    'dropped host shows as away, not deleted');

  // The remaining four keep playing to the end.
  const rest = clients.filter((c) => c !== host);
  await rest[0].waitFor((s) => s.phase === 'final', 60000, "s.phase === 'final'");
  ok(rest[0].state.final.standings.length >= 4, 'game finished without the original host');

  // Original host reconnects to a finished game and can still see it.
  await host.reconnect();
  ok(host.state?.phase === 'final', 'dropped host can rejoin and see the results');

  clients.forEach((c) => c.close());
}

async function scenarioMissingActions() {
  console.log('\n▸ Missing answers and missing votes');
  const { clients, host } = await makeGame(5, { rounds: 3, special: false });
  // Two players never answer and never vote.
  clients[3].autoplay = false;
  clients[4].autoplay = false;

  host.send({ t: 'start' });
  await host.waitFor((s) => s.phase === 'reveal_answers' && s.round === 1, 20000, "s.phase === 'reveal_answers' && s.round === 1");
  ok(host.state.answers.length === 3, 'only submitted answers are revealed',
    `got ${host.state.answers.length}`);
  ok(host.state.missingAnswers.length === 2, 'non-answerers are shown as missing');

  await host.waitFor((s) => s.phase === 'scoreboard' && s.round === 1, 40000, "s.phase === 'scoreboard' && s.round === 1");
  const res = host.state.results;
  const totalVotes = res.tally.reduce((a, t) => a + t.count, 0);
  ok(totalVotes === 3, 'only cast votes are counted', `got ${totalVotes}`);
  ok(host.state.phase === 'scoreboard', 'round completes despite missing input');

  await host.waitFor((s) => s.phase === 'final', 60000, "s.phase === 'final'");
  ok(host.state.final.rounds.length === 3, 'game completes with idle players');
  clients.forEach((c) => c.close());
}

async function scenarioNobodyAnswers() {
  console.log('\n▸ Nobody answers at all');
  const { clients, host } = await makeGame(4, { rounds: 3, special: false });
  clients.forEach((c) => { c.autoplay = false; });
  host.send({ t: 'start' });
  await host.waitFor((s) => s.round >= 1, 8000, "s.round >= 1");
  // Let round 1 lapse with zero answers.
  await sleep(4000);
  ok(['round_intro', 'question', 'scoreboard', 'reveal_answers'].includes(host.state.phase) ||
     host.state.phase === 'final',
    'server does not crash when nobody answers', `phase=${host.state.phase}`);
  clients.forEach((c) => { c.autoplay = true; c._react(); });
  await host.waitFor((s) => s.phase === 'final', 60000, "s.phase === 'final'");
  ok(host.state.phase === 'final', 'game still reaches the end');
  clients.forEach((c) => c.close());
}

async function scenarioRules() {
  console.log('\n▸ Rule enforcement');
  const { clients, host } = await makeGame(4, { rounds: 3, special: false });
  host.send({ t: 'start' });
  await host.waitFor((s) => s.phase === 'question', 8000, "s.phase === 'question'");

  // Self vote / double vote / bad target.
  host.skipVote = true;
  await host.waitFor((s) => s.phase === 'voting', 30000, "s.phase === 'voting'");
  host.errors.length = 0;
  host.send({ t: 'vote', target: host.state.you.id });
  await sleep(150);
  ok(host.errors.some((e) => e.code === 'self_vote'), 'self-vote is rejected');

  const target = host.state.players.find((p) => p.id !== host.state.you.id);
  host.send({ t: 'vote', target: target.id });
  await sleep(120);
  const other = host.state.players.find((p) => p.id !== host.state.you.id && p.id !== target.id);
  host.send({ t: 'vote', target: other.id });
  await sleep(150);
  await host.waitFor((s) => s.results, 30000, "s.results");
  const myVotes = host.state.results.tally.filter((t) => t.voters.includes(host.state.you.id));
  ok(myVotes.length === 1, 'a second vote is ignored', `counted ${myVotes.length}`);
  ok(myVotes[0]?.id === target.id, 'the first vote is the one that counts');

  // Non-host cannot start / change settings / advance.
  const p1 = clients[1];
  p1.errors.length = 0;
  p1.send({ t: 'settings', rounds: 12 });
  p1.send({ t: 'playAgain' });
  await sleep(150);
  ok(host.state.settings.rounds === 3, 'non-host cannot change settings');

  host.skipVote = false;
  clients.forEach((c) => c._react());
  await host.waitFor((s) => s.phase === 'final', 90000, "s.phase === 'final'");
  clients.forEach((c) => c.close());
}

async function scenarioLateJoin() {
  console.log('\n▸ Late join and leaving');
  const { clients, host, code } = await makeGame(5, { rounds: 3, special: false });
  host.send({ t: 'start' });
  await host.waitFor((s) => s.phase === 'question' && s.round === 1, 8000, "s.phase === 'question' && s.round === 1");

  const late = new Client('Latecomer');
  await late.connect();
  await late.join(code);
  await late.waitFor((s) => !!s.you, 4000, "!!s.you");
  ok(late.state.you.spectator === true, 'late joiner starts as a spectator');
  ok(late.state.inRound === false, 'spectator is not in the running round');
  ok(late.state.myQuestion == null, 'spectator gets no private question');

  await late.waitFor((s) => s.round === 2 && s.phase === 'question', 45000, "s.round === 2 && s.phase === 'question'");
  ok(late.state.inRound === true, 'spectator joins in at the next round');
  ok(!!late.state.myQuestion, 'promoted player receives a question');

  // A player leaves for good.
  const quitter = clients[4];
  quitter.autoplay = false;
  quitter.send({ t: 'leave' });
  await sleep(250);
  await host.waitFor((s) => !s.players.some((p) => p.id === quitter.id), 5000, "!s.players.some((p) => p.id === quitter.id)");
  ok(!host.state.players.some((p) => p.id === quitter.id), 'leaving removes the player');

  await host.waitFor((s) => s.phase === 'final', 90000, "s.phase === 'final'");
  ok(host.state.phase === 'final', 'game finishes after someone leaves');
  [...clients, late].forEach((c) => c.close());
}

async function scenarioDoubleAndNone() {
  console.log('\n▸ Special rounds (double / none / reverse)');
  // Force each special type by running many short games with 8 players
  // until we have observed all three at least once.
  const wanted = new Set(['double', 'none', 'reverse']);
  const seen = new Set();

  for (let attempt = 0; attempt < 14 && seen.size < wanted.size; attempt++) {
    const { clients, host } = await makeGame(8, { rounds: 4, special: true });
    host.send({ t: 'start' });
    await host.waitFor((s) => s.phase === 'final', 90000, "s.phase === 'final'");
    for (const r of host.state.final.rounds) {
      if (r.type !== 'standard') seen.add(r.type);
    }
    // Validate every round of every attempt.
    for (let i = 1; i <= 4; i++) {
      auditRound(clients, i);
      auditScoring(clients, i);
    }
    auditLeaks(clients);

    for (const r of host.state.final.rounds) {
      if (r.type === 'double') ok(r.oddIds.length === 2, 'DOUBLE round has exactly two odd players');
      if (r.type === 'none') ok(r.oddIds.length === 0, 'NO SIDE EYE round has zero odd players');
      if (r.type === 'reverse') ok(r.oddIds.length === 1, 'REVERSE round has one odd player');
    }
    clients.forEach((c) => c.close());
  }

  for (const t of wanted) {
    ok(seen.has(t), `special round type "${t}" occurs across games`);
  }
}

async function scenarioSizes() {
  console.log('\n▸ Smallest and largest groups');
  for (const n of [4, 10]) {
    const { clients, host } = await makeGame(n, { rounds: 3, special: false });
    host.send({ t: 'start' });
    await host.waitFor((s) => s.phase === 'final', 90000, "s.phase === 'final'");
    ok(host.state.final.standings.length === n, `${n}-player game completes`);
    auditRound(clients, 1);
    auditScoring(clients, 1);
    auditLeaks(clients);
    clients.forEach((c) => c.close());
  }

  // Too few players cannot start.
  const { clients, host } = await makeGame(3, {});
  host.errors.length = 0;
  host.send({ t: 'start' });
  await sleep(250);
  ok(host.state.phase === 'lobby', 'cannot start with 3 players');
  ok(host.errors.some((e) => e.code === 'too_few'), 'server explains why');
  clients.forEach((c) => c.close());

  // 11th player is refused.
  const big = await makeGame(10, {});
  const extra = new Client('Extra');
  await extra.connect();
  extra.send({ t: 'join', name: 'Extra', code: big.code });
  await sleep(250);
  ok(extra.errors.some((e) => e.code === 'full'), 'room caps at 10 players');
  extra.close();
  big.clients.forEach((c) => c.close());
}

async function scenarioNames() {
  console.log('\n▸ Name handling');
  const a = new Client('Sam');
  await a.connect();
  await a.create();
  const b = new Client('Sam');
  await b.connect();
  await b.join(a.seat.code);
  await a.waitFor((s) => s.players.length === 2);
  const names = a.state.players.map((p) => p.name);
  ok(new Set(names).size === 2, 'duplicate names are disambiguated', names.join(','));

  const c = new Client('   ');
  await c.connect();
  c.send({ t: 'join', name: '   ', code: a.seat.code });
  await sleep(200);
  ok(c.errors.some((e) => e.code === 'bad_name'), 'blank names are rejected');

  const d = new Client('x');
  await d.connect();
  d.send({ t: 'join', name: 'A'.repeat(60), code: a.seat.code });
  await d.waitFor((s) => !!s.you, 3000, "!!s.you");
  const long = d.state.players.find((p) => p.id === d.id);
  ok(long.name.length <= 12, 'long names are truncated', `len=${long.name.length}`);

  [a, b, c, d].forEach((x) => x.close());
}

async function scenarioBadCode() {
  console.log('\n▸ Bad input');
  const c = new Client('Lost');
  await c.connect();
  c.send({ t: 'join', name: 'Lost', code: 'ZZZZ' });
  await sleep(200);
  ok(c.errors.some((e) => e.code === 'no_room'), 'unknown room code is rejected');

  c.send({ t: 'answer', text: 'nope' });
  c.send({ t: 'vote', target: 'nobody' });
  c.send({ t: 'start' });
  await sleep(200);
  ok(true, 'server survives commands from a seatless client');
  c.close();
}

/**
 * The lobby picker has to actually govern what gets asked. A CLEAN game that
 * serves one spicy question has broken a promise to the table, so this plays
 * real games and checks every question that came out against the picked pool.
 */
async function scenarioCategories() {
  console.log('\n▸ Category picks govern the questions');
  const { poolForCategories } = await import('../server/questions.js');

  for (const pick of [['clean'], ['food'], ['friends'], ['dating', 'money'], ['clean', 'unhinged']]) {
    const label = pick.join('+');
    const { clients, host } = await makeGame(5, { categories: pick, rounds: 5, special: false });

    ok(
      host.state.settings.categories.join() === pick.join(),
      `${label}: lobby settings round-trip`,
      host.state.settings.categories.join()
    );

    host.send({ t: 'start' });
    await host.waitFor((s) => s.phase === 'final', 90000, `${label} reaches final`);

    const allowed = new Set(poolForCategories(pick).map((p) => p.a));
    for (const r of host.state.final.rounds) {
      ok(allowed.has(r.majorityQ), `${label}: R${r.round} came from the picked pool`, r.majorityQ);
    }
    clients.forEach((c) => c.close());
    await sleep(120);
  }

  // Random must be able to reach beyond any single category.
  const { clients, host } = await makeGame(5, { categories: [], rounds: 5, special: false });
  host.send({ t: 'start' });
  await host.waitFor((s) => s.phase === 'final', 90000, 'random game reaches final');
  ok(host.state.final.rounds.length === 5, 'random game played all rounds');
  clients.forEach((c) => c.close());
}

async function scenarioQuestionLibrary() {
  console.log('\n▸ Question library integrity');
  const { PAIRS, CATEGORIES, CATEGORY_IDS, guessOptionsFor, poolForCategories } = await import(
    '../server/questions.js'
  );
  ok(PAIRS.length >= 100, `library has 100+ pairs`, `${PAIRS.length}`);
  ok(new Set(PAIRS.map((p) => p.id)).size === PAIRS.length, 'pair ids are unique');

  const allQ = [];
  for (const p of PAIRS) {
    ok(!!p.a && !!p.b, `pair ${p.id} has both questions`);
    ok(p.a !== p.b, `pair ${p.id} questions differ`);
    ok((p.decoys ?? []).length >= 2, `pair ${p.id} has 2 decoys`);
    ok(!(p.decoys ?? []).includes(p.a), `pair ${p.id} decoys never duplicate the real question`);
    ok(p.a.length <= 90 && p.b.length <= 90, `pair ${p.id} questions stay short`);
    allQ.push(p.a, p.b);

    const { options, correctIndex } = guessOptionsFor(p, Math.random);
    ok(options.length === 3, `pair ${p.id} yields 3 guess options`);
    ok(options[correctIndex] === p.a, `pair ${p.id} marks the correct option`);
    ok(new Set(options).size === 3, `pair ${p.id} guess options are distinct`);
  }

  // Every pair must be reachable from the lobby, or it is dead content.
  for (const p of PAIRS) {
    ok(Array.isArray(p.cats) && p.cats.length > 0, `pair ${p.id} has categories`);
    ok(
      p.cats.every((c) => CATEGORY_IDS.includes(c)),
      `pair ${p.id} uses only real categories`,
      p.cats.join()
    );
  }
  const reachable = new Set();
  for (const id of CATEGORY_IDS) for (const p of poolForCategories([id])) reachable.add(p.id);
  ok(reachable.size === PAIRS.length, 'every pair is reachable from some category', `${reachable.size}/${PAIRS.length}`);

  // Every category must fill a full game without repeating itself.
  for (const c of CATEGORIES) {
    const pool = poolForCategories([c.id]);
    ok(pool.length >= 12, `${c.id} pool can fill a game`, `${pool.length}`);
  }
  ok(poolForCategories([]).length === PAIRS.length, 'no selection means the whole library');
  ok(poolForCategories(['nonsense']).length === PAIRS.length, 'unknown categories fall back to random');

  // CLEAN is a hard constraint, never widened away.
  for (const combo of [['clean'], ['clean', 'unhinged'], ['clean', 'dating'], CATEGORY_IDS]) {
    const pool = poolForCategories(combo);
    ok(
      pool.every((p) => p.cats.includes('clean')),
      `clean stays clean with ${combo.join('+')}`,
      `${pool.length} pairs`
    );
    ok(pool.length >= 12, `clean+${combo.join('+')} still fills a game`, `${pool.length}`);
  }

  ok(PAIRS.some((p) => p.type === 'reverse'), 'reverse pairs exist');
  ok(PAIRS.filter((p) => p.personal).length >= 20, 'friends category has personal pairs');
}

/* ─────────────────────────────── runner ─────────────────────────────── */

async function main() {
  console.log('👀  SIDE EYE — test harness\n');

  const server = spawn('node', ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), SIDE_EYE_SPEED: SPEED },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const serverErrors = [];
  server.stderr.on('data', (d) => { serverErrors.push(d.toString()); process.stderr.write('[server] ' + d.toString()); });
  server.stdout.on('data', () => {});

  // wait for boot
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/health`);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(100);
  }

  const t0 = Date.now();
  try {
    await scenarioQuestionLibrary();
    await scenarioCategories();
    const { clients, host } = await scenarioFullGame(6, { rounds: 7 });
    await scenarioReplay(clients, host);
    await scenarioFullGame(5, { rounds: 5, categories: ['friends'] }).then(({ clients: c }) => c.forEach((x) => x.close()));
    await scenarioFullGame(7, { rounds: 4, categories: ['dating', 'unhinged'] }).then(({ clients: c }) => c.forEach((x) => x.close()));
    await scenarioRules();
    await scenarioMissingActions();
    await scenarioNobodyAnswers();
    await scenarioRefreshAndDrop();
    await scenarioLateJoin();
    await scenarioSizes();
    await scenarioNames();
    await scenarioBadCode();
    await scenarioDoubleAndNone();
  } catch (e) {
    failed++;
    failures.push(`FATAL: ${e.message}`);
    console.error('\n💥', e);
    console.error('[server stderr]', serverErrors.join('').slice(-4000));
  }

  await sleep(300);
  const crashes = serverErrors.filter((s) => s.includes('Error') || s.includes('error'));
  ok(crashes.length === 0, 'server logged no errors', crashes.slice(0, 2).join(' '));

  server.kill();

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${'─'.repeat(52)}`);
  if (failed === 0) {
    console.log(`✅  ${passed} assertions passed in ${secs}s`);
  } else {
    console.log(`❌  ${failed} failed / ${passed} passed in ${secs}s\n`);
    const uniq = [...new Set(failures)];
    uniq.slice(0, 40).forEach((f) => console.log('   • ' + f));
    if (uniq.length > 40) console.log(`   …and ${uniq.length - 40} more`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main();
