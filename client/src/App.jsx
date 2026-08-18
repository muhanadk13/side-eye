import { useCallback, useEffect, useRef, useState } from 'react';
import { createConnection, clearSeat, loadSeat } from './lib/net.js';
import Home from './screens/Home.jsx';
import Lobby from './screens/Lobby.jsx';
import Final from './screens/Final.jsx';
import { RoundIntro, Question, RevealAnswers, Discussion, Voting, OddGuess } from './screens/Round.jsx';
import { RevealVotes, RevealIdentity, RevealQuestion, Scoreboard } from './screens/Reveal.jsx';
import { Eye } from './components/Eye.jsx';

export default function App() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState('connecting');
  const conn = useRef(null);
  const skew = useRef(0);
  const toastTimer = useRef(null);

  const prefillCode = (() => {
    const p = new URLSearchParams(location.search).get('room');
    return p ? p.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) : null;
  })();

  useEffect(() => {
    conn.current = createConnection({
      onState: (s) => {
        // Keep the client clock honest so every phone shows the same countdown.
        if (s.serverNow) skew.current = Date.now() - s.serverNow;
        setState(s);
        setError(null);
      },
      onJoined: () => setError(null),
      onError: (e) => {
        // Only surface errors a player can act on. Bookkeeping failures from a
        // stale seat must never land on a fresh Create/Join form.
        const noise = ['no_session', 'replaced', 'server'];
        setError(noise.includes(e.code) ? null : e.message);
        if (['no_room', 'no_player', 'kicked', 'replaced'].includes(e.code)) setState(null);
      },
      onToast: (text) => {
        setToast(text);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3400);
      },
      onStatus: setStatus,
    });
    return () => conn.current?.close();
  }, []);

  const send = useCallback((msg) => conn.current?.send(msg), []);

  const leave = useCallback(() => {
    send({ t: 'leave' });
    clearSeat();
    setState(null);
    if (location.search) history.replaceState(null, '', location.pathname);
  }, [send]);

  // Keep the screen awake during a game — nothing kills a party game like a
  // phone locking mid-vote.
  useEffect(() => {
    if (!state || state.phase === 'lobby') return undefined;
    let lock = null;
    let cancelled = false;
    navigator.wakeLock
      ?.request('screen')
      .then((l) => {
        if (cancelled) l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      lock?.release().catch(() => {});
    };
  }, [state?.phase === 'lobby']); // eslint-disable-line react-hooks/exhaustive-deps

  const hadSeat = !!loadSeat();

  if (!state) {
    if (hadSeat && status !== 'offline' && !error) {
      return (
        <div className="app">
          <div className="screen center">
            <div className="spinner-eyes">
              <Eye size={30} look={-0.6} color="var(--dimmer)" />
              <Eye size={30} look={0.6} color="var(--dimmer)" />
            </div>
            <p className="sub mt-16">Getting you back in…</p>
          </div>
        </div>
      );
    }
    // A dead server must not take the whole app down with it — the home screen
    // and the rules read fine offline, so keep them and be honest in a banner.
    return (
      <div className="app">
        <Home send={send} error={error} prefillCode={prefillCode} offline={status === 'unreachable'} />
        {status === 'offline' && <div className="toast">Reconnecting…</div>}
        {/* A lasting condition belongs at the top, out of the way of the
            buttons. Toasts are for things that pass. */}
        {status === 'unreachable' && (
          <div className="status-bar" role="status">
            Can't reach the game server — still trying 👀
          </div>
        )}
      </div>
    );
  }

  const p = state.phase;
  let screen;

  if (p === 'lobby') screen = <Lobby state={state} send={send} />;
  else if (p === 'round_intro') screen = <RoundIntro state={state} />;
  else if (p === 'question') screen = <Question state={state} send={send} skew={skew.current} />;
  else if (p === 'reveal_answers') screen = <RevealAnswers state={state} send={send} />;
  else if (p === 'discussion') screen = <Discussion state={state} send={send} skew={skew.current} />;
  else if (p === 'voting') screen = <Voting state={state} send={send} skew={skew.current} />;
  else if (p === 'odd_guess') screen = <OddGuess state={state} send={send} skew={skew.current} />;
  else if (p === 'reveal_votes') screen = <RevealVotes state={state} send={send} />;
  else if (p === 'reveal_identity') screen = <RevealIdentity state={state} />;
  else if (p === 'reveal_question') screen = <RevealQuestion state={state} send={send} />;
  else if (p === 'scoreboard') screen = <Scoreboard state={state} send={send} />;
  else if (p === 'final') screen = <Final state={state} send={send} onLeave={leave} />;
  else screen = <div className="screen center"><p className="sub">Loading…</p></div>;

  return (
    <div className="app" key={p === 'reveal_identity' ? 'ri' : 'main'}>
      {screen}



      {status === 'offline' && <div className="toast">Reconnecting…</div>}
      {toast && status !== 'offline' && <div className="toast">{toast}</div>}
    </div>
  );
}
