import { useEffect, useState } from 'react';
import { LiveEyes, Eye } from '../components/Eye.jsx';
import { Button, CountUp, useStagger, MuteToggle } from '../components/Bits.jsx';
import { sfx } from '../lib/sound.js';

/** Special-round names as players should read them, not as the engine names them. */
const ROUND_LABEL = {
  double: 'DOUBLE SIDE EYE',
  none: 'NO SIDE EYE',
  reverse: 'REVERSE',
};

export default function Final({ state, send, onLeave }) {
  const f = state.final ?? { standings: [], awards: [], rounds: [] };
  const [stage, setStage] = useState(0);
  const champ = f.standings[0];
  const tiedChamps = f.standings.filter((s) => champ && s.score === champ.score);
  const awardsShown = useStagger(f.awards.length, { delay: 260, start: 400, enabled: stage >= 1 });

  useEffect(() => {
    sfx.drum();
    const t = setTimeout(() => {
      setStage(1);
      sfx.win();
    }, 1900);
    return () => clearTimeout(t);
  }, []);

  if (stage === 0) {
    return (
      <div className="reveal-stage">
        <div className="pulse-eyes">
          <LiveEyes size={44} gap={16} autoplay={false} />
        </div>
        <h2 className="shout dim">And the champion is…</h2>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <span className="rnd">Game over</span>
        <div className="row gap-8" style={{ marginLeft: 'auto' }}>
          <MuteToggle />
          <button className="btn quiet" onClick={onLeave}>
            Leave
          </button>
        </div>
      </div>

      {f.reason === 'not-enough-players' && (
        <div className="banner" style={{ marginBottom: 16 }}>
          Too many people dropped out, so we called it early.
        </div>
      )}

      <div className="champ">
        <div className="row gap-8" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: 26 }}>👑</span>
          <span className="kicker acid">Side eye champion</span>
        </div>
        <h1 className="cn">{tiedChamps.map((c) => c.name).join(' & ') || '—'}</h1>
        <p className="display" style={{ fontSize: 34, color: 'var(--acid)' }}>
          <CountUp value={champ?.score ?? 0} duration={900} />
          <span style={{ fontSize: 15, color: 'var(--dim)', marginLeft: 6 }}>pts</span>
        </p>
      </div>

      {f.awards.length > 0 && (
        <div className="stack gap-9 mt-24">
          <span className="kicker">The superlatives</span>
          <div className="scroll-list">
            {f.awards.slice(0, awardsShown).map((a) => (
              <div className="award" key={a.title}>
                <span className="em">{a.emoji}</span>
                <div className="stack">
                  <span className="at">{a.title}</span>
                  <span className="an">{a.name}</span>
                  <span className="ad">
                    {a.blurb} · {a.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stack gap-9 mt-24">
        <span className="kicker">Final standings</span>
        <div className="scroll-list">
          {f.standings.map((p, i) => (
            <div className={`score-row${p.id === state.you?.id ? ' me' : ''}`} key={p.id}>
              <span className="rank">{i + 1}</span>
              <span className="snm">{p.name}</span>
              <span className="tot" style={{ marginLeft: 'auto' }}>
                {p.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {f.rounds?.length > 0 && (
        <div className="stack gap-9 mt-24">
          <span className="kicker">Who had it</span>
          <div className="scroll-list">
            {f.rounds.map((r) => (
              <div className="card" key={r.round}>
                <div className="row gap-12">
                  <Eye
                    size={20}
                    look={r.caught ? 0.7 : -0.7}
                    color={r.caught ? 'var(--acid)' : 'var(--dimmer)'}
                  />
                  <div className="stack" style={{ minWidth: 0 }}>
                    <span className="kicker" style={{ fontSize: 10 }}>
                      Round {r.round}
                      {ROUND_LABEL[r.type] ? ` · ${ROUND_LABEL[r.type]}` : ''}
                    </span>
                    <span className="sub tight" style={{ color: 'var(--text)' }}>
                      {r.oddIds.length === 0
                        ? 'Nobody had side eye'
                        : r.oddIds
                            .map((id) => state.players.find((p) => p.id === id)?.name ?? '—')
                            .join(' & ')}
                    </span>
                  </div>
                  <span className="badge" style={{ marginLeft: 'auto', flex: '0 0 auto' }}>
                    {r.oddIds.length === 0 ? 'Chaos' : r.caught ? 'Caught' : 'Escaped'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grow" style={{ minHeight: 24 }} />

      <div className="sticky-foot stack gap-8">
        {state.youAreHost ? (
          <Button className="full" onClick={() => send({ t: 'playAgain' })}>
            Run it again
          </Button>
        ) : (
          <div className="row gap-8" style={{ justifyContent: 'center', minHeight: 56 }}>
            <LiveEyes size={20} gap={7} color="var(--dimmer)" />
            <span className="sub">Waiting for the host to run it back…</span>
          </div>
        )}
      </div>
    </div>
  );
}
