import { useState } from 'react';
import { Eye, LiveEyes } from '../components/Eye.jsx';
import { Button, PlayerChip, MuteToggle } from '../components/Bits.jsx';
import { sfx } from '../lib/sound.js';
import Rules from './Rules.jsx';

const CATEGORIES = [
  { id: 'everyday', label: 'Everyday', emoji: '🌍' },
  { id: 'dating', label: 'Dating', emoji: '💘' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'friends', label: 'Friends', emoji: '🫂' },
  { id: 'party', label: 'Party', emoji: '🎉' },
  { id: 'money', label: 'Money', emoji: '💸' },
  { id: 'unhinged', label: 'Unhinged', emoji: '🌀' },
  { id: 'clean', label: 'Clean', emoji: '🧼' },
];

const CROWD = [
  null,
  null,
  'Two people cannot side-eye each other. Get more friends.',
  'Almost. One more.',
  'Four is playable. Five is better.',
  'Five. Now it gets good.',
  'Six people about to ruin a friendship.',
  'Seven people judging each other tonight.',
  'Eight. This is going to be loud.',
  'Nine. Absolute chaos incoming.',
  'Ten. Maximum side-eye.',
];

export default function Lobby({ state, send }) {
  const [copied, setCopied] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const isHost = state.youAreHost;
  const players = state.players;
  const connected = players.filter((p) => p.connected);
  const canStart = connected.length >= 4;
  const picked = state.settings.categories ?? [];
  const cleanOnly = picked.length === 1 && picked[0] === 'clean';
  const toggle = (list, id) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  if (showHow) return <Rules onClose={() => setShowHow(false)} />;

  const copy = async () => {
    const url = `${location.origin}/?room=${state.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      sfx.join();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    const url = `${location.origin}/?room=${state.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SIDE EYE', text: `Join my game — code ${state.code}`, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copy();
  };

  return (
    <div className="screen">
      <div className="topbar">
        <span className="rnd">Lobby</span>
        <div className="row gap-8" style={{ marginLeft: 'auto' }}>
          <span className="badge">{connected.length}/10</span>
          <MuteToggle />
        </div>
      </div>

      <button className="code-plate" onClick={share} aria-label={`Room code ${state.code}. Tap to share.`}>
        <span className="kicker">Room code — tap to share</span>
        <span className="cc">{state.code}</span>
        <span className="sub tight">{copied ? 'Link copied 👀' : 'sideeye.game / join'}</span>
      </button>

      <div className="stack gap-10 mt-24">
        <span className="kicker">In the room</span>
        {CROWD[Math.min(connected.length, 10)] && (
          <p className="sub tight" style={{ marginTop: -4 }}>
            {CROWD[Math.min(connected.length, 10)]}
          </p>
        )}
        <div className="player-grid mt-8">
          {players.map((p) => (
            <PlayerChip
              key={p.id}
              player={p}
              tag={p.isHost ? 'Host' : !p.connected ? 'Away' : null}
              // Only offer removal for someone who has actually dropped —
              // a kick button on every friend is hostile.
              onKick={
                isHost && !p.connected ? (id) => send({ t: 'kick', playerId: id }) : null
              }
            />
          ))}
        </div>
      </div>

      {isHost ? (
        <div className="stack gap-12 mt-24">
          <div className="row gap-8">
            <span className="kicker">Categories</span>
            <span className="sub tight" style={{ marginLeft: 'auto' }}>
              {picked.length === 0
                ? 'Random — everything'
                : cleanOnly
                  ? 'Family-safe only'
                  : `${picked.length} picked`}
            </span>
          </div>

          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`cat-btn${picked.includes(c.id) ? ' on' : ''}`}
                aria-pressed={picked.includes(c.id)}
                onClick={() => {
                  sfx.tap();
                  send({ t: 'settings', categories: toggle(picked, c.id) });
                }}
              >
                <span className="ce">{c.emoji}</span>
                <span className="cl">{c.label}</span>
              </button>
            ))}
          </div>

          <button
            className={`btn ghost sm${picked.length === 0 ? ' on-quiet' : ''}`}
            onClick={() => {
              sfx.tap();
              send({ t: 'settings', categories: [] });
            }}
          >
            🎲 Random — use everything
          </button>

          {picked.includes('clean') && picked.length > 1 && (
            <p className="sub tight">
              Clean is a filter, so this keeps only the family-safe questions from what you picked.
            </p>
          )}

          <div className="row gap-12 mt-8">
            <div className="stack">
              <span className="kicker">Rounds</span>
              <span className="sub tight">~{Math.round(state.settings.rounds * 2.1)} min</span>
            </div>
            <div className="stepper" style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => send({ t: 'settings', rounds: Math.max(3, state.settings.rounds - 1) })}
                aria-label="Fewer rounds"
              >
                −
              </button>
              <span className="val">{state.settings.rounds}</span>
              <button
                onClick={() => send({ t: 'settings', rounds: Math.min(12, state.settings.rounds + 1) })}
                aria-label="More rounds"
              >
                +
              </button>
            </div>
          </div>

          <div className="row gap-12">
            <div className="stack">
              <span className="kicker">Twists</span>
              <span className="sub tight">Rare surprise rounds</span>
            </div>
            <button
              className={`badge${state.settings.specialRounds ? ' acid-b' : ''}`}
              style={{ marginLeft: 'auto', minHeight: 34 }}
              onClick={() => send({ t: 'settings', specialRounds: !state.settings.specialRounds })}
            >
              {state.settings.specialRounds ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card mt-24">
          <div className="row gap-12">
            <LiveEyes size={22} gap={7} color="var(--dimmer)" />
            <div className="stack">
              <span className="kicker">Waiting on the host</span>
              <span className="sub tight">
                {picked.length
                  ? CATEGORIES.filter((c) => picked.includes(c.id))
                      .map((c) => c.label)
                      .join(' · ')
                  : 'Random categories'}{' '}
                · {state.settings.rounds} rounds
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grow" style={{ minHeight: 20 }} />

      <button className="btn quiet mt-16" onClick={() => setShowHow(true)}>
        How to play 👀
      </button>

      <div className="sticky-foot">
        {isHost ? (
          <Button
            className="full"
            disabled={!canStart}
            onClick={() => {
              sfx.lock();
              send({ t: 'start' });
            }}
          >
            {canStart ? 'Start game' : `Need ${4 - connected.length} more`}
          </Button>
        ) : (
          <div className="row gap-8" style={{ justifyContent: 'center', minHeight: 56 }}>
            <Eye size={20} look={-0.5} color="var(--dimmer)" />
            <span className="sub">The side-eye starts soon…</span>
            <Eye size={20} look={0.5} color="var(--dimmer)" />
          </div>
        )}
      </div>
    </div>
  );
}
