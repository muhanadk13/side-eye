/**
 * WebSocket client with automatic reconnect + seat restoration.
 * The seat (playerId/token) lives in localStorage so a refresh, a dropped
 * connection, or an accidentally-closed tab all put you back in your game.
 */

const KEY = 'sideeye.seat';

export function loadSeat() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSeat(seat) {
  try {
    localStorage.setItem(KEY, JSON.stringify(seat));
  } catch {
    /* private mode — we just lose reconnect */
  }
}

export function clearSeat() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/**
 * Where the game server lives.
 *
 * Same-origin by default, which is what the all-in-one deploy and local dev
 * both want. When the client is hosted separately (a static host like Netlify
 * cannot hold a WebSocket open), set VITE_SERVER_URL at build time to the
 * origin of the real game server.
 */
/** How far past a phase deadline we tolerate before pulling fresh state. */
const STALE_MS = 4000;

export const SERVER_URL = (import.meta.env?.VITE_SERVER_URL ?? '').trim().replace(/\/+$/, '');

function wsUrl() {
  if (SERVER_URL) {
    return `${SERVER_URL.replace(/^http/, 'ws')}/ws`;
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

export function createConnection({ onState, onJoined, onError, onToast, onStatus }) {
  let ws = null;
  let closed = false;
  let attempt = 0;
  let everConnected = false;
  let queue = [];
  let retryTimer = null;
  let pingTimer = null;
  let staleTimer = null;
  let lastState = null;
  let lastStateAt = 0;

  const flush = () => {
    if (ws?.readyState !== 1) return;
    const q = queue;
    queue = [];
    for (const m of q) ws.send(JSON.stringify(m));
  };

  function connect() {
    if (closed) return;
    onStatus?.(attempt === 0 ? 'connecting' : 'reconnecting');
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      return scheduleRetry();
    }

    ws.onopen = () => {
      attempt = 0;
      everConnected = true;
      onStatus?.('online');
      const seat = loadSeat();
      if (seat?.code && seat?.playerId && seat?.token) {
        ws.send(JSON.stringify({ t: 'rejoin', ...seat }));
      }
      flush();
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (ws?.readyState === 1) ws.send(JSON.stringify({ t: 'ping' }));
      }, 25000);

      /*
       * Self-heal a stale screen.
       *
       * A phone that slept, a half-open socket, or a single dropped broadcast
       * leaves you stuck on a screen the rest of the room has moved past — and
       * because the socket still looks healthy, reconnect never fires. Every
       * phase carries a server deadline, so if that deadline is well past and
       * nothing has arrived since, ask the server where we actually are.
       */
      clearInterval(staleTimer);
      staleTimer = setInterval(() => {
        if (ws?.readyState !== 1 || !lastState?.phaseEndsAt) return;
        const now = Date.now();
        const overdue = now - lastState.phaseEndsAt;
        const silent = now - lastStateAt;
        if (overdue > STALE_MS && silent > STALE_MS) ws.send(JSON.stringify({ t: 'resync' }));
      }, 2000);
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.t === 'state') {
        lastState = msg.state;
        lastStateAt = Date.now();
        onState?.(msg.state);
      }
      else if (msg.t === 'joined') {
        saveSeat({ code: msg.code, playerId: msg.playerId, token: msg.token });
        onJoined?.(msg);
      } else if (msg.t === 'toast') onToast?.(msg.text);
      else if (msg.t === 'error') {
        if (['no_room', 'no_player', 'kicked'].includes(msg.code)) clearSeat();
        onError?.(msg);
      }
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      clearInterval(staleTimer);
      if (closed) return;
      onStatus?.('offline');
      scheduleRetry();
    };

    ws.onerror = () => {
      try { ws.close(); } catch { /* noop */ }
    };
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    attempt += 1;
    // Never reached the server at all? Say so, instead of spinning forever on
    // a 'Reconnecting…' toast that implies there was a connection to lose.
    if (!everConnected && attempt >= 3) onStatus?.('unreachable');
    const delay = Math.min(6000, 400 * 2 ** Math.min(attempt, 4)) + Math.random() * 250;
    retryTimer = setTimeout(connect, delay);
  }

  connect();

  return {
    send(msg) {
      if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
      else queue.push(msg);
    },
    close() {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      clearInterval(staleTimer);
      try { ws?.close(); } catch { /* noop */ }
    },
  };
}
