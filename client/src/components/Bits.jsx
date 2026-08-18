import { useEffect, useRef, useState } from 'react';
import { Eye } from './Eye.jsx';
import { sfx, isMuted, setMuted } from '../lib/sound.js';

/** Server-synced countdown. Everything derives from `phaseEndsAt`. */
export function useCountdown(endsAt, skew = 0) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return { ms: null, secs: null };
  const ms = Math.max(0, endsAt - (now + skew));
  return { ms, secs: Math.ceil(ms / 1000) };
}

export function TopBar({ label, endsAt, total, skew = 0, right = null, tickFrom = 5 }) {
  const { ms, secs } = useCountdown(endsAt, skew);
  const pct = ms != null && total ? Math.max(0, Math.min(1, ms / total)) : null;
  const urgent = secs != null && secs <= 5;
  const last = useRef(null);

  useEffect(() => {
    if (secs == null || secs > tickFrom || secs <= 0) return;
    if (last.current !== secs) {
      last.current = secs;
      sfx.tick();
    }
  }, [secs, tickFrom]);

  return (
    <div className="stack gap-8" style={{ marginBottom: 18 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <span className="rnd">{label}</span>
        {right}
        {secs != null && (
          <span className={`clock${urgent ? ' urgent' : ''}`} aria-label={`${secs} seconds left`}>
            {secs}
          </span>
        )}
      </div>
      {pct != null && (
        <div className={`timerbar${urgent ? ' urgent' : ''}`} role="timer">
          <i style={{ width: `${pct * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', onClick, sound = true, ...rest }) {
  return (
    <button
      className={`btn ${variant} ${className}`}
      onClick={(e) => {
        if (sound) sfx.tap();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PlayerChip({ player, ready, tag, onKick }) {
  const away = player.connected === false;
  return (
    <div className={`p-chip${ready ? ' ready' : ''}${away ? ' off' : ''}`}>
      <Eye
        size={21}
        look={ready ? 0.75 : -0.3}
        color={ready ? 'var(--acid)' : away ? 'var(--dimmer)' : 'var(--dim)'}
      />
      <span className="nm">{player.name}</span>
      {tag && <span className="tag">{tag}</span>}
      {onKick && (
        <button
          className="chip-x"
          onClick={() => onKick(player.id)}
          aria-label={`Remove ${player.name} from the room`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Sound toggle. Lives inline in a topbar so it never covers anything. */
export function MuteToggle() {
  const [muted, setMutedState] = useState(isMuted());
  return (
    <button
      className="icon-btn"
      onClick={() => {
        const v = !muted;
        setMuted(v);
        setMutedState(v);
        if (!v) sfx.tap();
      }}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      aria-pressed={muted}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

export function WaitingEyes({ text }) {
  return (
    <div className="stack center-text gap-16" style={{ alignItems: 'center' }}>
      <div className="spinner-eyes">
        <Eye size={26} look={-0.6} color="var(--dimmer)" />
        <Eye size={26} look={0} color="var(--dimmer)" />
        <Eye size={26} look={0.6} color="var(--dimmer)" />
      </div>
      {text && <p className="sub">{text}</p>}
    </div>
  );
}

/** Counts up to `value` — used for score reveals. */
export function CountUp({ value, duration = 700 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="mono-num">{n}</span>;
}

/**
 * Fire `submit` just before the phase deadline.
 *
 * If someone typed an answer or tapped a name but never hit the button, their
 * intent still counts. Losing a typed answer to the buzzer feels like a bug to
 * the player, and an unexplained "no answer" row poisons the deduction.
 */
export function useBuzzerSubmit(endsAt, skew, hasValue, submit) {
  const fn = useRef(submit);
  fn.current = submit;
  useEffect(() => {
    if (!endsAt || !hasValue) return undefined;
    const fireAt = endsAt - (Date.now() + skew) - 800;
    if (fireAt <= 0) {
      fn.current();
      return undefined;
    }
    const id = setTimeout(() => fn.current(), fireAt);
    return () => clearTimeout(id);
  }, [endsAt, skew, hasValue]);
}

/** Staggered reveal: returns how many items should currently be visible. */
export function useStagger(count, { delay = 900, start = 700, enabled = true }) {
  const [shown, setShown] = useState(enabled ? 0 : count);
  useEffect(() => {
    if (!enabled) {
      setShown(count);
      return undefined;
    }
    setShown(0);
    const timers = [];
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(() => {
          setShown(i + 1);
          sfx.reveal();
        }, start + i * delay)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [count, delay, start, enabled]);
  return shown;
}
