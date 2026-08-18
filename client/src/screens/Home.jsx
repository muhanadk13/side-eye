import { useEffect, useRef, useState } from 'react';
import { Wordmark, Eye } from '../components/Eye.jsx';
import { Button } from '../components/Bits.jsx';
import Rules from './Rules.jsx';

const NAME_MAX = 12;

export default function Home({ send, error, prefillCode, offline = false }) {
  const [view, setView] = useState(prefillCode ? 'join' : 'home');
  const [showRules, setShowRules] = useState(false);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('sideeye.name') ?? '';
    } catch {
      return '';
    }
  });
  const [code, setCode] = useState(prefillCode ?? '');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (error) setBusy(false);
  }, [error]);

  useEffect(() => {
    if (view !== 'home') setTimeout(() => nameRef.current?.focus(), 260);
  }, [view]);

  const remember = (n) => {
    try {
      localStorage.setItem('sideeye.name', n);
    } catch {
      /* noop */
    }
  };

  const go = () => {
    const n = name.trim();
    if (!n) return;
    remember(n);
    setBusy(true);
    if (view === 'create') send({ t: 'create', name: n });
    else send({ t: 'join', name: n, code: code.trim().toUpperCase() });
  };

  const canGo = name.trim().length > 0 && (view === 'create' || code.trim().length === 4);

  if (showRules) return <Rules onClose={() => setShowRules(false)} />;

  if (view === 'home') {
    return (
      <div className="screen center">
        <div className="grow" style={{ flexGrow: 1.4 }} />
        <Wordmark eyeSize={52} />
        <p className="sub mt-16" style={{ fontSize: 17, maxWidth: 320 }}>
          Someone got a different question.
        </p>
        <div className="grow" style={{ flexGrow: 1 }} />
        <div className="stack gap-10 full" style={{ maxWidth: 400, alignItems: 'center' }}>
          <p className="sub tight" style={{ letterSpacing: '0.07em', opacity: 0.7, marginBottom: 6 }}>
            Answer. Accuse. Find the odd one.
          </p>
          <Button className="full" disabled={offline} onClick={() => setView('create')}>
            {offline ? 'Server offline' : 'Create game'}
          </Button>
          <Button variant="ghost" className="full" disabled={offline} onClick={() => setView('join')}>
            Join game
          </Button>
          <button className="btn quiet mt-8" onClick={() => setShowRules(true)}>
            How to play
          </button>
        </div>
        <div className="grow" style={{ flexGrow: 0.35 }} />
      </div>
    );
  }

  const creating = view === 'create';

  return (
    <div className="screen">
      <div className="topbar">
        <button className="btn quiet" onClick={() => setView('home')} style={{ paddingLeft: 0 }}>
          ← Back
        </button>
      </div>

      <div className="grow" style={{ flexGrow: 0.7 }} />

      <div className="row gap-12" style={{ marginBottom: 22 }}>
        <Eye size={32} look={0.6} />
        <h2 className="display">{creating ? 'New game' : 'Join a game'}</h2>
      </div>

      <form
        className="stack gap-16"
        onSubmit={(e) => {
          e.preventDefault();
          if (canGo && !busy) go();
        }}
      >
        {!creating && (
          <div className="stack gap-8">
            <label className="kicker" htmlFor="code">
              Room code
            </label>
            <input
              id="code"
              className="field code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4))
              }
              placeholder="ABCD"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
              maxLength={4}
            />
          </div>
        )}

        <div className="stack gap-8">
          <label className="kicker" htmlFor="nm">
            Your name
          </label>
          <input
            id="nm"
            ref={nameRef}
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            placeholder="What do people call you?"
            autoComplete="given-name"
            enterKeyHint="go"
            maxLength={NAME_MAX}
          />
        </div>

        {error && <div className="banner">{error}</div>}

        <Button type="submit" className="full mt-8" disabled={!canGo || busy}>
          {busy ? 'Hold on…' : creating ? 'Create room' : 'Join room'}
        </Button>
      </form>

      <p className="sub tight center-text mt-16">
        {creating
          ? 'You get a 4-letter code to share. 4–10 players.'
          : 'Ask the host for the 4-letter code.'}
      </p>

      <div className="grow" style={{ flexGrow: 1.3 }} />
    </div>
  );
}
