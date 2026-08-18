import { useEffect } from 'react';
import { Eye, LiveEyes } from '../components/Eye.jsx';
import { Button } from '../components/Bits.jsx';

/**
 * How to play.
 *
 * The whole game is one idea, and one worked example teaches it faster than any
 * amount of prose. So: state the idea, show a real round, then the mechanics.
 * Somebody should be able to read this out loud to a table in 30 seconds.
 */

const EXAMPLE = [
  { name: 'Sarah', answer: 'Bowling' },
  { name: 'Adam', answer: 'The movies' },
  { name: 'Priya', answer: 'Mini golf' },
  { name: 'Marcus', answer: 'A coffee shop' },
  { name: 'Chloe', answer: 'A nice restaurant' },
  { name: 'Devon', answer: 'Chuck E. Cheese', odd: true },
];

const STEPS = [
  {
    n: '1',
    title: 'Answer',
    body: 'You get a question on your own phone. Type a few words. Nobody sees anything yet.',
  },
  {
    n: '2',
    title: 'Read',
    body: 'Everyone’s answers appear together. One of them was answering a different question.',
  },
  {
    n: '3',
    title: 'Argue',
    body: 'Talk out loud. Accuse people. Defend yourself. Lying is completely allowed.',
  },
  {
    n: '4',
    title: 'Vote',
    body: 'Everyone secretly picks one person. You can’t vote for yourself, and you can’t change it.',
  },
  {
    n: '5',
    title: 'Reveal',
    body: 'Both questions come out. Everyone finds out why that weird answer happened.',
  },
];

export default function Rules({ onClose }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="screen">
      <div className="topbar">
        <span className="rnd">How to play</span>
        <button className="btn quiet" style={{ marginLeft: 'auto' }} onClick={onClose}>
          Close ✕
        </button>
      </div>

      {/* ── The idea ── */}
      <div className="center-text stack gap-12" style={{ alignItems: 'center', marginBottom: 30 }}>
        <LiveEyes size={34} gap={12} />
        <h2 className="shout" style={{ marginTop: 6 }}>
          Everyone gets
          <br />
          the same question.
        </h2>
        <h2 className="shout acid">One person doesn’t.</h2>
        <p className="sub" style={{ maxWidth: 330 }}>
          Your job is to work out who. Their job is to blend in — without knowing they’re the one
          blending in.
        </p>
      </div>

      {/* ── The worked example ── */}
      <div className="rule-block">
        <span className="kicker">Here’s a real round</span>

        <div className="reveal-card mt-16" style={{ animation: 'none' }}>
          <p className="lbl">Five of them got</p>
          <p className="qq">Where would you take someone on a first date?</p>
        </div>

        <p className="sub tight mt-16" style={{ marginBottom: 8 }}>
          Everyone answers. Then the answers land:
        </p>

        <div className="scroll-list">
          {EXAMPLE.map((e) => (
            <div className={`ans-row${e.odd ? ' odd-hit' : ''}`} key={e.name} style={{ animation: 'none' }}>
              <span className="who">{e.name}</span>
              <span className="what">{e.answer}</span>
            </div>
          ))}
        </div>

        <div className="row gap-10 mt-16" style={{ alignItems: 'flex-start' }}>
          <Eye size={22} look={0.8} />
          <p className="sub tight" style={{ color: 'var(--text)' }}>
            Everybody turns and looks at Devon. Devon panics — <em>“Chuck E. Cheese is fun!”</em>
          </p>
        </div>

        <div className="reveal-card odd mt-16" style={{ animation: 'none' }}>
          <p className="lbl">But Devon got</p>
          <p className="qq">Where would you take a 7-year-old for their birthday?</p>
        </div>

        <p className="sub mt-16" style={{ color: 'var(--text)' }}>
          Devon’s answer was <strong className="acid">perfect</strong> — for Devon’s question.
          That’s the whole game.
        </p>
      </div>

      {/* ── The twist ── */}
      <div className="rule-highlight mt-24">
        <span className="kicker acid">The part that makes it work</span>
        <p className="display" style={{ fontSize: 22, marginTop: 8, lineHeight: 1.15 }}>
          The odd player is never told.
        </p>
        <p className="sub mt-8">
          They see one question and assume it’s the normal one, exactly like you do. Nobody in the
          room knows anything. That’s why everyone looks guilty — and why it might be you.
        </p>
      </div>

      {/* ── A round, step by step ── */}
      <div className="stack gap-10 mt-24">
        <span className="kicker">Every round, in order</span>
        {STEPS.map((s) => (
          <div className="step" key={s.n}>
            <span className="step-n">{s.n}</span>
            <div className="stack">
              <span className="step-t">{s.title}</span>
              <span className="sub tight">{s.body}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Points ── */}
      <div className="stack gap-10 mt-24">
        <span className="kicker">Points</span>
        <div className="card stack gap-10">
          <div className="row gap-12">
            <span className="pts">+1</span>
            <span className="sub tight" style={{ color: 'var(--text)' }}>
              You voted for the odd player
            </span>
          </div>
          <div className="row gap-12">
            <span className="pts">+2</span>
            <span className="sub tight" style={{ color: 'var(--text)' }}>
              You <em>were</em> the odd player and nobody caught you
            </span>
          </div>
          <div className="row gap-12">
            <span className="pts">+1</span>
            <span className="sub tight" style={{ color: 'var(--text)' }}>
              You were the odd player and guessed what everyone else got
            </span>
          </div>
        </div>
        <p className="sub tight">
          Nobody is ever eliminated. Seven rounds, then a champion and some very petty awards.
        </p>
      </div>

      {/* ── Good to know ── */}
      <div className="stack gap-10 mt-24">
        <span className="kicker">Good to know</span>
        <div className="card stack gap-8">
          <span className="sub tight">
            <strong style={{ color: 'var(--text)' }}>Don’t read your question out loud.</strong>{' '}
            Describe it, dodge it, lie about it — just never quote it word for word.
          </span>
          <span className="sub tight">
            <strong style={{ color: 'var(--text)' }}>Best with 5–8 people</strong> in the same room,
            or on a call. Works from 4 to 10.
          </span>
          <span className="sub tight">
            <strong style={{ color: 'var(--text)' }}>Sometimes the game lies to you.</strong> Once in
            a while two people are odd — or nobody is.
          </span>
        </div>
      </div>

      <div className="sticky-foot">
        <Button className="full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  );
}
