/**
 * Fills a room with bot players so a human (or a browser automation session)
 * can play a real game end to end.
 *
 *   node test/bots.js <ROOMCODE> [count] [port-or-url]
 *
 * The last argument accepts a full origin as well as a port, so bots can join
 * over the same public URL real players use rather than only via localhost.
 */

import WebSocket from 'ws';

const CODE = (process.argv[2] || '').toUpperCase();
const COUNT = Number(process.argv[3] || 5);
const TARGET = process.argv[4] || '3001';
const WS_URL = /^https?:\/\//.test(TARGET)
  ? TARGET.replace(/^http/, 'ws').replace(/\/+$/, '') + '/ws'
  : `ws://localhost:${Number(TARGET)}/ws`;

if (!CODE) {
  console.error('usage: node test/bots.js <ROOMCODE> [count] [port-or-url]');
  process.exit(1);
}

const NAMES = ['Sarah', 'Adam', 'Priya', 'Marcus', 'Chloe', 'Devon', 'Nour', 'Kai', 'Riley'];

/**
 * Bots answer the shape of the question they actually got, not a generic pool.
 * A bot that says "a blanket" to "something you'd hear at a family dinner" makes
 * every round look broken — and it hides the whole point of the game, which is
 * that the odd answer should stand out on its own.
 */
const BANKS = {
  place: [
    'Bowling', 'The movies', 'Mini golf', 'A coffee shop', 'The park', 'A nice restaurant',
    'The arcade', 'The beach', 'Ice cream', 'A museum', 'Karaoke', 'The aquarium',
    'A rooftop bar', 'The zoo', 'A diner', 'Somewhere quiet',
  ],
  object: [
    'My charger', 'Snacks', 'Sunscreen', 'Headphones', 'Deodorant', 'A towel',
    'Cash', 'A water bottle', 'Bug spray', 'Extra socks', 'A speaker', 'Sunglasses',
    'My passport', 'Gum', 'A phone charger', 'Flip flops',
  ],
  food: [
    'Pizza', 'Leftover rice', 'Cold soup', 'Sushi', 'A whole onion', 'Cereal',
    'Ramen', 'Chicken wings', 'Ice cream', 'Something spicy',
  ],
  saying: [
    '"So what do you do?"', '"We need to talk"', '"Who did this?"', '"I told you so"',
    '"Is that yours?"', '"Not again"', '"Be honest with me"', '"Just five more minutes"',
    '"That was my last one"', '"Whose is this?"',
  ],
  thing: [
    'Their ex', 'Loud chewing', 'Bad wifi', 'Running out of money', 'Someone crying',
    'Being late', 'A weird smell', 'Too much honesty', 'Awkward silence', 'A group photo',
    'The bill', 'Someone’s mom', 'Old receipts', 'A dead phone',
  ],
};

function bankFor(q = '') {
  const s = q.toLowerCase();
  if (/^where|a (bad|good) place|place to/.test(s)) return BANKS.place;
  if (/\b(eat|food|meal|order|cook|breakfast)\b/.test(s)) return BANKS.food;
  if (/\b(say|said|hear|yell|shout|whisper|tell|words|line)\b/.test(s)) return BANKS.saying;
  if (/\b(bring|take|forget|find|pack|grab|carry|buy|own)\b/.test(s)) return BANKS.object;
  return BANKS.thing;
}

class Bot {
  constructor(name) {
    this.name = name;
    this.acted = new Set();
  }

  async start() {
    this.ws = new WebSocket(WS_URL);
    await new Promise((res, rej) => {
      this.ws.on('open', res);
      this.ws.on('error', rej);
    });
    this.ws.on('message', (raw) => this.onMsg(JSON.parse(raw.toString())));
    this.ws.on('close', () => console.log(`${this.name} disconnected`));
    this.send({ t: 'join', name: this.name, code: CODE });
  }

  onMsg(m) {
    if (m.t === 'joined') {
      this.id = m.playerId;
      console.log(`${this.name} joined ${m.code}`);
    }
    if (m.t === 'error') console.log(`${this.name}: ${m.code} — ${m.message}`);
    if (m.t !== 'state') return;

    const s = m.state;
    if (this.phase !== s.phase) {
      this.phase = s.phase;
      if (this.name === NAMES[0]) console.log(`  → ${s.phase} (round ${s.round})`);
    }
    const key = `${s.round}:${s.phase}`;
    if (s.phase === 'lobby') this.acted.clear();
    if (this.acted.has(key)) return;

    // Bots act on a human-ish delay so the UI states are actually visible.
    if (s.phase === 'question' && s.inRound && !s.myAnswer) {
      this.acted.add(key);
      const delay = 2500 + Math.random() * 9000;
      const myQ = s.myQuestion;
      setTimeout(() => {
        const pool = s.personal
          ? s.players.filter((p) => p.id !== this.id).map((p) => p.name)
          : bankFor(myQ);
        this.send({ t: 'answer', text: pool[Math.floor(Math.random() * pool.length)] });
      }, delay);
    } else if (s.phase === 'voting' && s.inRound && !s.myVote) {
      this.acted.add(key);
      setTimeout(() => {
        const others = s.players.filter((p) => !p.spectator && p.id !== this.id);
        if (others.length) {
          this.send({ t: 'vote', target: others[Math.floor(Math.random() * others.length)].id });
        }
      }, 2000 + Math.random() * 6000);
    } else if (s.phase === 'odd_guess' && s.oddGuess && s.oddGuess.chosen == null) {
      this.acted.add(key);
      setTimeout(() => {
        this.send({ t: 'oddGuess', index: Math.floor(Math.random() * s.oddGuess.options.length) });
      }, 1500 + Math.random() * 4000);
    }
  }

  send(msg) {
    if (this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
  }
}

const bots = [];
for (let i = 0; i < COUNT; i++) {
  const b = new Bot(NAMES[i % NAMES.length]);
  await b.start();
  bots.push(b);
  await new Promise((r) => setTimeout(r, 220));
}

console.log(`\n${COUNT} bots in room ${CODE} via ${WS_URL}. Ctrl-C to stop.`);
process.on('SIGINT', () => {
  bots.forEach((b) => b.ws.close());
  process.exit(0);
});
