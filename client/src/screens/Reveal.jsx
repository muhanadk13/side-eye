import { useEffect, useMemo, useState } from 'react';
import { Eye, LiveEyes } from '../components/Eye.jsx';
import { Button, CountUp, useStagger } from '../components/Bits.jsx';
import { sfx } from '../lib/sound.js';

const nameOf = (state, id) => state.players.find((p) => p.id === id)?.name ?? '—';

function HostNext({ state, send, label = 'Next →' }) {
  if (!state.youAreHost) return null;
  return (
    <button className="btn quiet" style={{ marginLeft: 'auto' }} onClick={() => send({ t: 'advance' })}>
      {label}
    </button>
  );
}

/* ───────────────────────────── VOTE REVEAL ───────────────────────────── */

export function RevealVotes({ state, send }) {
  const r = state.results;
  const rows = useMemo(() => {
    if (!r) return [];
    const withVotes = [...r.tally].sort((a, b) => b.count - a.count);
    return withVotes;
  }, [r]);
  const shown = useStagger(rows.length, { delay: 520, start: 1000 });

  useEffect(() => {
    sfx.drum();
  }, []);

  if (!r) return null;
  const max = Math.max(1, r.maxVotes);

  return (
    <div className="screen">
      <div className="topbar">
        <span className="rnd">Round {state.round}</span>
        <HostNext state={state} send={send} />
      </div>

      <div className="grow" style={{ maxHeight: 30 }} />

      <div className="center-text stack gap-6" style={{ marginBottom: 26 }}>
        <h2 className="shout">The votes are in.</h2>
        <p className="sub">Somebody is not going to like this.</p>
      </div>

      <div className="stack">
        {rows.slice(0, shown).map((row, i) => (
          <div key={row.id}>
            <div className={`tally-row${row.count === r.maxVotes ? ' top' : ''}`} style={{ animationDelay: `${i * 0.02}s` }}>
              <span className="tname">{nameOf(state, row.id)}</span>
              <span className="bar">
                <i style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <span className="cnt">{row.count}</span>
            </div>
            {row.voters.length > 0 && (
              <p className="voters-line">
                from {row.voters.map((v) => nameOf(state, v)).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {rows.length === 0 && <p className="sub center-text">Nobody voted. Bold strategy.</p>}

      <div className="grow" />
    </div>
  );
}

/* ─────────────────────── IDENTITY REVEAL (the moment) ─────────────────────── */

export function RevealIdentity({ state }) {
  const r = state.results;
  const [stage, setStage] = useState(0); // 0 build, 1 name

  useEffect(() => {
    sfx.drum();
    const t = setTimeout(() => {
      setStage(1);
      sfx.sting();
      if (navigator.vibrate) navigator.vibrate([12, 60, 22]);
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  if (!r) return null;

  if (r.noOdd) {
    return (
      <div className="reveal-stage">
        {stage === 0 ? (
          <>
            <div className="pulse-eyes">
              <LiveEyes size={44} gap={16} color="var(--dimmer)" autoplay={false} />
            </div>
            <h2 className="shout dim">Side eye was on…</h2>
          </>
        ) : (
          <>
            <LiveEyes size={48} gap={18} color="var(--violet)" />
            <h1 className="reveal-name" style={{ color: 'var(--violet)', fontSize: 'clamp(32px,10vw,58px)' }}>
              NOBODY.
            </h1>
            <p className="sub" style={{ maxWidth: 300, fontSize: 16 }}>
              Everyone got the same question. You did that to each other.
            </p>
          </>
        )}
      </div>
    );
  }

  const names = r.oddNames ?? [];

  return (
    <div className="reveal-stage">
      {stage === 0 ? (
        <>
          <div className="pulse-eyes">
            <LiveEyes size={44} gap={16} color="var(--acid)" autoplay={false} />
          </div>
          <h2 className="shout dim">Side eye was on…</h2>
        </>
      ) : (
        <>
          <LiveEyes size={40} gap={15} />
          <div className="stack gap-8" style={{ alignItems: 'center' }}>
            {names.map((n) => (
              <h1 className="reveal-name" key={n}>
                {n}
              </h1>
            ))}
          </div>
          <span className={`badge ${r.caught ? 'acid-b' : 'violet-b'}`} style={{ fontSize: 12 }}>
            {r.caught ? 'Caught 🎯' : 'They got away with it 🐍'}
          </span>
          {r.type === 'double' && (
            <p className="sub tight">Double side eye. Two of them. All night.</p>
          )}
        </>
      )}
    </div>
  );
}

/* ────────────────────── QUESTION REVEAL (the payoff) ────────────────────── */

export function RevealQuestion({ state, send }) {
  const r = state.results;
  useEffect(() => {
    sfx.reveal();
  }, []);
  if (!r) return null;

  if (r.noOdd) {
    return (
      <div className="screen">
        <div className="topbar">
          <span className="rnd">Round {state.round}</span>
          <HostNext state={state} send={send} label="Scores →" />
        </div>
        <div className="grow" />
        <div className="center-text stack gap-12" style={{ alignItems: 'center' }}>
          <span className="badge violet-b">No side eye</span>
          <h2 className="shout">Everybody got:</h2>
          <div className="reveal-card full">
            <p className="qq">{r.majorityQ}</p>
          </div>
          <p className="sub mt-8">Every single accusation was friendly fire. +1 to everyone.</p>
        </div>
        <div className="grow" />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <span className="rnd">Round {state.round}</span>
        <HostNext state={state} send={send} label="Scores →" />
      </div>

      <div className="center-text" style={{ marginBottom: 18 }}>
        <h2 className="shout">
          {r.caught ? 'Caught.' : 'They got away with it.'}
        </h2>
      </div>

      <div className="reveal-card">
        <p className="lbl">Everyone else got</p>
        <p className="qq">{r.majorityQ}</p>
      </div>

      <div className="reveal-card odd">
        <p className="lbl">
          {r.oddNames.join(' & ')} got
        </p>
        <p className="qq">{r.oddQ}</p>

        {r.oddAnswers.map(
          (o) =>
            o.answer && (
              <div className="their-answer" key={o.id}>
                <p className="lbl" style={{ color: 'var(--dim)' }}>
                  {r.oddAnswers.length > 1 ? `${o.name} said` : 'Their answer'}
                </p>
                <p className="big">{o.answer}</p>
              </div>
            )
        )}
      </div>

      <div className="grow" style={{ minHeight: 16 }} />

      <div className="stack gap-8">
        {r.oddGuessCorrect.map((g) => (
          <div className="card" key={g.id}>
            <div className="row gap-12">
              <Eye size={22} look={g.correct ? 0.7 : -0.7} color={g.correct ? 'var(--acid)' : 'var(--dimmer)'} />
              <span className="sub tight">
                {g.correct ? (
                  <>
                    <strong style={{ color: 'var(--acid)' }}>{nameOf(state, g.id)}</strong> guessed the
                    real question. +1 bonus.
                  </>
                ) : g.answered ? (
                  <>
                    {nameOf(state, g.id)} guessed wrong about what everyone else got.
                  </>
                ) : (
                  <>{nameOf(state, g.id)} never guessed the real question.</>
                )}
              </span>
            </div>
          </div>
        ))}
        {r.youWereOdd && (
          <div className="card" style={{ borderColor: 'var(--line-2)' }}>
            <span className="sub tight">
              That was you. {r.caught ? 'Rough.' : 'Nobody suspected a thing.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── SCOREBOARD ───────────────────────────── */

export function Scoreboard({ state, send }) {
  const r = state.results;
  const gains = new Map((r?.gains ?? []).map((g) => [g.id, g.points]));
  const rows = [...state.players]
    .filter((p) => !p.spectator)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const shown = useStagger(rows.length, { delay: 130, start: 260 });
  const last = state.round >= state.totalRounds;

  useEffect(() => {
    const g = gains.get(state.you?.id) ?? 0;
    if (g > 0) setTimeout(() => sfx.win(), 500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen">
      <div className="topbar">
        <span className="rnd">
          After round {state.round} of {state.totalRounds}
        </span>
        <HostNext state={state} send={send} label={last ? 'Results →' : 'Next round →'} />
      </div>

      <div className="center-text stack gap-6" style={{ marginBottom: 20 }}>
        <h2 className="shout">Scores</h2>
        <p className="sub">
          {(gains.get(state.you?.id) ?? 0) > 0
            ? `You picked up +${gains.get(state.you?.id)} this round.`
            : 'Nothing for you this round. Brutal.'}
        </p>
      </div>

      <div className="scroll-list">
        {rows.slice(0, shown).map((p, i) => (
          <div className={`score-row${p.id === state.you?.id ? ' me' : ''}`} key={p.id}>
            <span className="rank">{i + 1}</span>
            <span className="snm">{p.name}</span>
            {(gains.get(p.id) ?? 0) > 0 && <span className="gain">+{gains.get(p.id)}</span>}
            <span className="tot" style={{ marginLeft: gains.get(p.id) ? 8 : 'auto' }}>
              <CountUp value={p.score} />
            </span>
          </div>
        ))}
      </div>

      <div className="grow" style={{ minHeight: 20 }} />

      {/* Scoring stays visible on the first scoreboard so nobody has to ask
          "wait, how do points work?" out loud mid-game. */}
      {state.round === 1 && (
        <div className="card stack gap-6 mt-16">
          <span className="kicker">How points work</span>
          <span className="sub tight">
            <strong className="acid">+1</strong> you voted for the odd player
          </span>
          <span className="sub tight">
            <strong className="acid">+2</strong> you had side eye and nobody caught you
          </span>
          <span className="sub tight">
            <strong className="acid">+1</strong> you had side eye and guessed the real question
          </span>
        </div>
      )}

      <p className="sub tight center-text mt-16">
        {last ? 'Final results coming up…' : `Round ${state.round + 1} loading…`}
      </p>
    </div>
  );
}
