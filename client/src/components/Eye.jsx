import { useEffect, useId, useRef, useState } from 'react';

/**
 * The SIDE EYE mark.
 *
 * An almond eye — pointed at both corners, not a lozenge — with the pupil
 * pushed off-centre. That off-centre pupil IS the logo: a glance, not a stare.
 * `look` runs -1 (hard left) … 1 (hard right).
 */
export function Eye({
  size = 34,
  look = 0.55,
  color = 'var(--acid)',
  pupil = '#09090b',
  blink = false,
  className = '',
  style,
}) {
  const id = useId().replace(/:/g, '');
  const w = size;
  const h = size * 0.62;
  // Pupil travels along the lid, and rides a little higher near the corners
  // so it stays inside the almond.
  const t = Math.max(-1, Math.min(1, look));
  const cx = 50 + t * 21;
  const r = 14.5 - Math.abs(t) * 2.2;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 62"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <clipPath id={`lid-${id}`}>
          <path d="M1 31 C 22 4, 78 4, 99 31 C 78 58, 22 58, 1 31 Z" />
        </clipPath>
      </defs>

      {blink ? (
        <path
          d="M4 31 C 26 27, 74 27, 96 31 C 74 35, 26 35, 4 31 Z"
          fill={color}
        />
      ) : (
        <g>
          <path d="M1 31 C 22 4, 78 4, 99 31 C 78 58, 22 58, 1 31 Z" fill={color} />
          <g clipPath={`url(#lid-${id})`}>
            <circle
              cx={cx}
              cy="31"
              r={r}
              fill={pupil}
              style={{ transition: 'cx 0.55s cubic-bezier(.22,1,.36,1), r 0.55s ease' }}
            />
          </g>
        </g>
      )}
    </svg>
  );
}

/**
 * A pair of eyes that idly glance around and blink.
 * They occasionally cut sideways at each other — the whole joke of the game.
 */
export function LiveEyes({ size = 40, gap = 12, color = 'var(--acid)', autoplay = true }) {
  const [look, setLook] = useState(0.5);
  const [blink, setBlink] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (!autoplay) return () => { alive.current = false; };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) return () => { alive.current = false; };

    let t1;
    let t2;
    const glance = () => {
      if (!alive.current) return;
      // Favour hard side-glances over dead-centre — centre looks like a stare.
      const dir = Math.random() < 0.5 ? -1 : 1;
      setLook(dir * (0.45 + Math.random() * 0.5));
      t1 = setTimeout(glance, 1500 + Math.random() * 2400);
    };
    const doBlink = () => {
      if (!alive.current) return;
      setBlink(true);
      setTimeout(() => alive.current && setBlink(false), 115);
      t2 = setTimeout(doBlink, 2800 + Math.random() * 4500);
    };
    t1 = setTimeout(glance, 800);
    t2 = setTimeout(doBlink, 2400);
    return () => {
      alive.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [autoplay]);

  return (
    <div className="eyes" style={{ gap }}>
      <Eye size={size} look={look} blink={blink} color={color} />
      <Eye size={size} look={look} blink={blink} color={color} />
    </div>
  );
}

/** Full lockup for the home screen. */
export function Wordmark({ eyeSize = 44 }) {
  return (
    <div className="wordmark">
      <LiveEyes size={eyeSize} gap={eyeSize * 0.26} />
      <div className="letters">
        <span>SIDE</span>
        <span>EYE</span>
      </div>
    </div>
  );
}
