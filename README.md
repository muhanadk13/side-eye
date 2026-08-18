# SIDE EYE 👀

**Someone got a different question.**

A fast multiplayer social-deduction party game for 4–10 people in the same room
(or on the same call). Everyone gets a question. One person's is different.
Nobody is told who — **not even them**.

Answer. Read the answers out loud. Argue. Vote. Find out.

```
EVERYONE ELSE GOT          Where would you take someone on a first date?
MUHANAD GOT                Where would you take a 7-year-old for their birthday?
THEIR ANSWER               CHUCK E. CHEESE
```

---

## Run it

```bash
npm install && npm run build && npm start
```

Open <http://localhost:3001>, hit **Create game**, and send the 4-letter code
(or the `/?room=CODE` link) to everyone else.

For UI work, `cd client && npm run dev` gives you Vite on :5173 with the API and
WebSocket proxied to :3001.

---

## Deploying

**Live: <https://side-eye-party.netlify.app>**

| Piece | Host | URL |
| --- | --- | --- |
| Client | Netlify | <https://side-eye-party.netlify.app> |
| Game server | Render (free) | <https://side-eye-server.onrender.com> |

Both redeploy from `main` — Render on push (autoDeploy), Netlify via
`npm run build && netlify deploy --prod --dir client/dist`.

The free Render instance sleeps after ~15 min idle and takes ~30s to wake. The
client shows a "can't reach the game server" bar and keeps retrying, so the
first player waits rather than seeing a broken page.

### Why it's split

SIDE EYE keeps live rooms in memory and holds a WebSocket open to every player
for the whole game. Netlify serves static files and short-lived serverless
functions — it can't hold a socket open, and its functions don't share memory
between invocations. So Netlify hosts the client; the server needs a host that
runs a persistent Node process.

### Standing it up again elsewhere

Any of these work. Free tiers are fine — a room is a few KB of memory.

| Host | How | Notes |
| --- | --- | --- |
| **Render** | Push to GitHub → New → Blueprint → pick the repo. `render.yaml` is already here. | Free instances sleep after ~15 min; first player waits ~30s while it wakes. |
| **Fly.io** | `fly launch` — it'll use the `Dockerfile`. | Stays warm, no cold start. |
| **Railway** | New Project → Deploy from repo. Detects the `Dockerfile`. | |

The `Dockerfile` builds the client too, so any Docker host gives you the whole
game on one URL with no Netlify needed at all.

Then point the client at it:

```bash
netlify env:set VITE_SERVER_URL https://your-server-url.onrender.com
```

```bash
npm run build && netlify deploy --prod --dir client/dist
```

Until that's set, the site loads, the rules read fine, and a bar at the top says
the server is unreachable — rather than silently failing.

## How a round works

| Phase | Default | What happens |
| --- | --- | --- |
| Round intro | 2.6s | `ROUND 3 OF 7` |
| Question | 22s | Your private question + your answer. Nobody sees anyone else's. |
| Answer reveal | staggered | Answers land one at a time. First big social moment. |
| Discussion | 50s | Talk. Accuse. Bluff. The game gets out of the way. |
| Voting | 16s | One secret pick. No self-votes, no take-backs, no live tallies. |
| Bonus guess | 11s | Only the odd player sees it: *"what did everyone else get?"* Everyone else sees a neutral `VOTES ARE LOCKED`. |
| Vote reveal | 7s | Who voted for whom. |
| Identity reveal | 5s | `SIDE EYE WAS ON…` |
| Question reveal | 11s | Both questions, side by side, plus their answer. The payoff. |
| Scoreboard | 9s | Points. |

Phases advance on their own; nobody has to press anything. The host gets
skip-ahead buttons for when a group is faster than the clock.

### Scoring

- **+1** you voted for the odd player
- **+2** you had side eye and nobody caught you
- **+1** you had side eye and guessed the majority question
- Tie at the top counts as **caught**
- Nobody is ever eliminated

### Special rounds

Roughly one per seven-round game, always mid-late, never enough to make the core
mechanic feel unreliable:

- **DOUBLE SIDE EYE** — two odd players, neither told (7+ players)
- **NO SIDE EYE** — everyone gets the same question; every accusation is friendly fire (5+ players)
- **REVERSE** — the odd question is the same situation, opposite framing

---

## Architecture

```
server/
  index.js      WebSocket transport, sessions, phase driver, watchdog
  game.js       Authoritative game state, scoring, awards, per-player views
  questions.js  171 curated question pairs, tagged into 8 categories
client/
  src/App.jsx        phase → screen routing
  src/lib/net.js     reconnecting socket + seat restoration
  src/screens/       one file per stage of the round
  src/components/    the eye mark, timers, chips, shared hooks
test/
  harness.js    headless multiplayer test suite (~56k assertions)
  bots.js       fills a room with bots so you can play a real game solo
```

**Secrecy is enforced server-side.** `viewFor(room, playerId)` in
[`server/game.js`](server/game.js) is the only way state reaches a client, and
it is rebuilt per player on every broadcast. Before the reveal, no client
receives `oddIds`, `oddQ`, `majorityQ`, the pair id, other players' answers, or
the vote tally — not hidden in the UI, *not sent at all*. The test suite asserts
this against every state snapshot every client received.

**Reconnection is a first-class case.** Your seat (`playerId` + `token`) lives in
`localStorage`; the socket reconnects with backoff and rejoins automatically. A
refresh mid-question gives you the same question back. If the host drops
mid-game, host transfers immediately so the room keeps moving — but in the lobby
and on the results screen it's held for 45s, so a refresh doesn't cost you your
seat or your "run it again" button.

**Nothing can freeze.** Every phase carries a server deadline, and a watchdog
force-advances any room that sits more than 2.5s past it. A table of six people
staring at a stuck screen is the one unrecoverable failure for a party game.

---

## Testing

```bash
npm test
```

Boots a real server, connects real WebSocket clients, and plays whole games
while asserting the things that matter: hidden information stays hidden, exactly
the intended number of odd players exist and are never told, scoring matches the
published rules independently recomputed, no self-votes or double-votes, and the
loop survives refreshes, drops, host loss, late joins, empty rounds, and 4- and
10-player extremes.

`TEST_SPEED` scales phase durations (default `0.05`, so a 7-round game runs in
seconds). The server honours the same `SIDE_EYE_SPEED` env var.

To play a real game yourself:

```bash
npm start
# create a room in the browser, then:
node test/bots.js <ROOMCODE> 5
```

---

## Question library

171 pairs, each filed under one or more of eight categories the host picks in
the lobby — or none, which draws from everything:

**EVERYDAY · DATING · FOOD · FRIENDS · PARTY · MONEY · UNHINGED · CLEAN**

Six are topics. Two are tones. **FRIENDS** pairs answer with the names of the
people in the room. **CLEAN** is deliberately not a topic — it's a filter: on its
own it's the family-safe library, and alongside other picks it narrows them
rather than adding spice back in. A table that ticks CLEAN means it, so it stays
a hard constraint even when the resulting pool is thin.

Every pair also carries tags, a spice rating used to ramp difficulty across a
game, and two hand-written decoys for the odd player's bonus guess.

The bar for a pair, applied to every one of them:

1. Can at least three believable answers work for **both** questions?
2. Could an innocent player accidentally look guilty?
3. Could the odd player reasonably believe their question is the normal one?
4. Does the reveal produce an "ohhhh"?

Pairs never repeat inside a game, and the odd-player role rotates so nobody is
picked twice before everyone has been picked once.

Adding a category means adding it to `CATEGORIES` and putting it in the `cats`
array of the pairs it covers — nothing else changes. The suite asserts every
pair is reachable from at least one category, that each category can fill a
whole game without repeating, and that CLEAN is never widened away.
