import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, LiveEyes } from '../components/Eye.jsx';
import {
  Button,
  TopBar,
  PlayerChip,
  WaitingEyes,
  useStagger,
  useCountdown,
  useBuzzerSubmit,
} from '../components/Bits.jsx';
import { sfx } from '../lib/sound.js';

const ANSWER_MAX = 40;

/* ───────────────────────────── ROUND INTRO ───────────────────────────── */

export function RoundIntro({ state }) {
  useEffect(() => {
    sfx.drum();
  }, [state.round]);
  return (
    <div className="screen center">
      <LiveEyes size={38} gap={13} />
      <p className="kicker mt-24">Round</p>
      <h1 className="display" style={{ fontSize: 'clamp(72px,26vw,140px)', marginTop: 4 }}>
        {state.round}
      </h1>
      <p className="sub">of {state.totalRounds}</p>

      {/* First-timers get the whole game explained in three lines, once. */}
      {state.round === 1 && (
        <div className="stack gap-6 mt-32" style={{ maxWidth: 340 }}>
          <p className="sub" style={{ color: 'var(--text)' }}>
            Everyone gets a question.
          </p>
          <p className="sub" style={{ color: 'var(--acid)' }}>
            One person's is different.
          </p>
          <p className="sub">Nobody knows who. Not even them.</p>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── QUESTION / ANSWER ────────────────────────── */

export function Question({ state, send, skew }) {
  const [text, setText] = useState('');
  const locked = state.myAnswer != null;
  const inputRef = useRef(null);
  const others = state.players.filter((p) => p.id !== state.you?.id && !p.spectator);

  useEffect(() => {
    setText('');
    const id = setTimeout(() => inputRef.current?.focus(), 420);
    return () => clearTimeout(id);
  }, [state.round]);

  const submit = () => {
    const t = text.trim();
    if (!t || locked) return;
    sfx.lock();
    send({ t: 'answer', text: t });
  };

  // Hooks stay above every early return.
  useBuzzerSubmit(state.phaseEndsAt, skew, !!text.trim() && !locked && state.inRound, submit);

  if (!state.inRound) {
    return (
      <div className="screen center">
        <span className="badge violet-b">Sitting out</span>
        <h2 className="display mt-16">Next round you're in.</h2>
        <p className="sub mt-8">Watch this one. Learn their tells.</p>
      </div>
    );
  }

  if (locked) {
    const readyIds = new Set(state.answeredIds ?? []);
    const inRound = state.players.filter((p) => !p.spectator);
    return (
      <div className="screen">
        <TopBar
          label={`Round ${state.round}/${state.totalRounds}`}
          endsAt={state.phaseEndsAt}
          total={state.phaseTotal ?? 22000}
          skew={skew}
        />
        <div className="grow" style={{ maxHeight: 20 }} />
        <div className="center-text stack gap-12" style={{ alignItems: 'center' }}>
          <LiveEyes size={34} gap={11} />
          <h2 className="shout mt-8">Locked in.</h2>
          <div className="card raised" style={{ maxWidth: 400 }}>
            <p className="kicker">You said</p>
            <p className="display" style={{ fontSize: 26, marginTop: 6 }}>
              {state.myAnswer}
            </p>
          </div>
          <p className="sub mt-8">
            {state.answeredCount} / {state.participantCount} answered
          </p>
        </div>

        <div className="player-grid mt-24">
          {inRound.map((p) => (
            // Only the finished players get a tag — a "thinking" label on
            // everyone else just eats the space their names need.
            <PlayerChip key={p.id} player={p} ready={readyIds.has(p.id)} tag={readyIds.has(p.id) ? 'In' : null} />
          ))}
        </div>
        <div className="grow" />
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar
        label={`Round ${state.round}/${state.totalRounds}`}
        endsAt={state.phaseEndsAt}
        total={state.phaseTotal ?? 22000}
        skew={skew}
      />

      <div className="q-card">
        <p className="kicker acid">Your question</p>
        <p className="q-text">{state.myQuestion}</p>
      </div>

      <p className="sub tight mt-12 center-text">
        Answer carefully. Yours might not be the same as everyone else's.
      </p>

      {/* The form sits directly under the question so both stay above a
          mobile keyboard. */}
      <form
        className="stack gap-8 mt-16"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          className="field answer"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, ANSWER_MAX))}
          placeholder="A few words…"
          maxLength={ANSWER_MAX}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          aria-label="Your answer"
        />
        {text.length > ANSWER_MAX - 15 && (
          <div className={`char-count${text.length > ANSWER_MAX - 6 ? ' warn' : ''}`}>
            {ANSWER_MAX - text.length} left
          </div>
        )}
        <Button type="submit" className="full" disabled={!text.trim()}>
          Lock it in
        </Button>
      </form>

      {state.personal && others.length > 0 && (
        <div className="stack gap-8 mt-16">
          <span className="kicker">Tap a name</span>
          <div className="hint-names">
            {others.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  sfx.tap();
                  setText(p.name);
                  inputRef.current?.focus();
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grow" style={{ minHeight: 16 }} />

      {state.youAreHost && (
        <button
          className="btn quiet"
          onClick={() => send({ t: 'skipQuestion' })}
          title="Swap this question for a different one"
        >
          Skip this question
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── ANSWER REVEAL ─────────────────────────── */

export function RevealAnswers({ state, send }) {
  const answers = state.answers ?? [];
  const shown = useStagger(answers.length, { delay: 950, start: 1100 });
  const done = shown >= answers.length;

  return (
    <div className="screen">
      <div className="topbar">
        <span className="rnd">
          Round {state.round}/{state.totalRounds}
        </span>
        {state.youAreHost && done && (
          <button className="btn quiet" style={{ marginLeft: 'auto' }} onClick={() => send({ t: 'advance' })}>
            Continue →
          </button>
        )}
      </div>

      <div className="center-text stack gap-6" style={{ marginBottom: 22 }}>
        <h2 className="shout">{done ? "That's everyone." : "Everyone's in."}</h2>
        <p className="sub">{done ? 'Read the room.' : "Let's see what they said…"}</p>
      </div>

      <div className="scroll-list">
        {answers.slice(0, shown).map((a) => (
          <div className="ans-row" key={a.playerId}>
            <span className="who">{a.name}</span>
            <span className="what">{a.answer}</span>
          </div>
        ))}
        {done &&
          (state.missingAnswers ?? []).map((m) => (
            <div className="ans-row missing" key={m.playerId}>
              <span className="who">{m.name}</span>
              <span className="what">no answer</span>
            </div>
          ))}
      </div>

      <div className="grow" style={{ minHeight: 20 }} />
      {!done && (
        <div className="center-text">
          <WaitingEyes />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── DISCUSSION ───────────────────────────── */

const PROMPTS = [
  "Someone's answer doesn't add up.",
  'Who are you side-eyeing?',
  'Make them explain themselves.',
  'The quiet one is usually guilty.',
  'Defend yourself. Or accuse someone.',
  'Nobody has to tell the truth.',
];

export function Discussion({ state, send, skew }) {
  const answers = state.answers ?? [];
  const prompt = useMemo(() => PROMPTS[(state.round + answers.length) % PROMPTS.length], [state.round, answers.length]);
  const { secs } = useCountdown(state.phaseEndsAt, skew);

  return (
    <div className="screen">
      <TopBar
        label={`Round ${state.round}/${state.totalRounds}`}
        endsAt={state.phaseEndsAt}
        total={state.phaseTotal ?? 50000}
        skew={skew}
        tickFrom={3}
        right={
          state.youAreHost ? (
            <button className="btn quiet" onClick={() => send({ t: 'advance' })}>
              Vote now →
            </button>
          ) : null
        }
      />

      <div className="center-text stack gap-6" style={{ marginBottom: 20 }}>
        <h2 className="shout">Talk it out.</h2>
        <p className="sub">{prompt}</p>
      </div>

      <div className="scroll-list">
        {answers.map((a) => (
          <div className="ans-row" key={a.playerId} style={{ animationDelay: '0s' }}>
            <span className="who">{a.name}</span>
            <span className="what">{a.answer}</span>
          </div>
        ))}
        {(state.missingAnswers ?? []).map((m) => (
          <div className="ans-row missing" key={m.playerId}>
            <span className="who">{m.name}</span>
            <span className="what">no answer</span>
          </div>
        ))}
      </div>

      <div className="grow" style={{ minHeight: 18 }} />

      <div className="card mt-16">
        <div className="row gap-12">
          <Eye size={24} look={secs != null && secs < 12 ? 0.8 : -0.4} />
          <span className="sub tight">
            {secs != null && secs <= 10 ? 'Voting opens in a second…' : 'Your question stays secret. Bluffing is encouraged.'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── VOTING ────────────────────────────── */

export function Voting({ state, send, skew }) {
  const [picked, setPicked] = useState(null);
  const locked = state.myVote != null;
  const answerBy = new Map((state.answers ?? []).map((a) => [a.playerId, a.answer]));
  const candidates = state.players.filter(
    (p) => !p.spectator && p.id !== state.you?.id && (answerBy.has(p.id) || p.connected)
  );

  useEffect(() => {
    setPicked(null);
  }, [state.round]);

  const castVote = () => {
    if (!picked || locked) return;
    sfx.lock();
    send({ t: 'vote', target: picked });
  };
  useBuzzerSubmit(state.phaseEndsAt, skew, !!picked && !locked, castVote);

  if (!state.inRound) {
    return (
      <div className="screen center">
        <WaitingEyes text="You're sitting this round out." />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="screen center">
        <LiveEyes size={36} gap={12} />
        <h2 className="shout mt-24">Vote locked.</h2>
        <p className="sub mt-8">
          {(state.votedIds?.length ?? 0)} / {state.participantCount} have voted
        </p>
        <p className="sub tight mt-24" style={{ maxWidth: 280 }}>
          No take-backs. Start working on your alibi.
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar
        label={`Round ${state.round}/${state.totalRounds}`}
        endsAt={state.phaseEndsAt}
        total={state.phaseTotal ?? 16000}
        skew={skew}
        tickFrom={5}
      />

      <div className="center-text stack gap-6" style={{ marginBottom: 20 }}>
        <h2 className="shout">
          Who are you<br />side-eyeing? 👀
        </h2>
        <p className="sub">One pick. It's final.</p>
      </div>

      <div className="vote-grid">
        {candidates.map((p) => (
          <button
            key={p.id}
            className={`vote-card${picked === p.id ? ' picked' : ''}`}
            onClick={() => {
              sfx.tap();
              setPicked(p.id);
            }}
          >
            <span className="pick-eye">
              <Eye size={22} look={0.7} />
            </span>
            <span className="vname">{p.name}</span>
            <span className="vans">{answerBy.get(p.id) ?? 'no answer'}</span>
          </button>
        ))}
      </div>

      <div className="grow" style={{ minHeight: 16 }} />

      <div className="sticky-foot">
        <Button
          className="full"
          disabled={!picked}
          onClick={castVote}
        >
          {picked
            ? `Side-eye ${state.players.find((p) => p.id === picked)?.name}`
            : 'Pick someone'}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────── ODD PLAYER BONUS GUESS ─────────────────────── */

export function OddGuess({ state, send, skew }) {
  const guess = state.oddGuess;

  if (!guess) {
    return (
      <div className="screen center">
        <LiveEyes size={34} gap={12} color="var(--dimmer)" />
        <h2 className="shout mt-24">Votes are locked.</h2>
        <p className="sub mt-8">Counting them up…</p>
      </div>
    );
  }

  const chosen = guess.chosen;

  return (
    <div className="screen">
      <TopBar label="One more thing…" endsAt={state.phaseEndsAt} total={state.phaseTotal ?? 11000} skew={skew} tickFrom={4} />

      <div className="stack gap-6" style={{ marginBottom: 18 }}>
        <h2 className="display">What do you think everyone else got?</h2>
        <p className="sub">Nail it and take a bonus point. Nobody else sees this.</p>
      </div>

      <div className="stack gap-8">
        {guess.options.map((o, i) => (
          <button
            key={o}
            className={`opt${chosen === i ? ' picked' : ''}`}
            disabled={chosen != null}
            onClick={() => {
              sfx.lock();
              send({ t: 'oddGuess', index: i });
            }}
          >
            <span className="letter">{'ABC'[i]}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>

      <div className="grow" />
      {chosen != null && (
        <p className="sub center-text">Locked. Now act natural.</p>
      )}
    </div>
  );
}
