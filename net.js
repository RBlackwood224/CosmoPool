'use strict';
/* =====================================================================
   COSMOPOOL — online transport (PeerJS, same idea as Deep Line)
   The host gets a 6-letter code, the guest joins with it or a link.
   Add ?nettest to the URL to test with two browser tabs (no internet).
   ===================================================================== */
const Net = {
  peer: null, conn: null, chan: null, isHost: false, code: '', ready: false, joinTimer: 0, helloTimer: 0,
  onOpen: null, onMsg: null, onClose: null, onError: null,
  testMode: typeof location !== 'undefined' && /[?&]nettest/.test(location.search),

  makeCode() { let s = ''; for (let i = 0; i < 6; i++) s += CODE_ABC[(Math.random() * 32) | 0]; return s; },

  loadLib() {
    if (this.testMode || window.Peer) return Promise.resolve(true);
    return new Promise(res => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = () => res(!!window.Peer);
      s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  },

  async host(code) {
    this.close();
    this.isHost = true; this.code = code;
    if (this.testMode) { this.testChannel(code, true); return; }
    if (!await this.loadLib()) { this.fail('nolib'); return; }
    this.peer = new Peer('cosmopool-' + code);
    this.peer.on('connection', c => { if (this.conn) { try { c.close(); } catch (e) {} return; } this.attach(c); });
    this.peer.on('error', e => this.fail(e && e.type));
    this.peer.on('disconnected', () => { try { if (this.peer && !this.peer.destroyed) this.peer.reconnect(); } catch (e) {} });
  },

  async join(code) {
    this.close();
    this.isHost = false; this.code = code;
    this.joinTimer = setTimeout(() => { if (!this.ready) this.fail('timeout'); }, 15000);
    if (this.testMode) { this.testChannel(code, false); return; }
    if (!await this.loadLib()) { this.fail('nolib'); return; }
    this.peer = new Peer();
    this.peer.on('open', () => this.attach(this.peer.connect('cosmopool-' + code, { reliable: true })));
    this.peer.on('error', e => this.fail(e && e.type));
  },

  attach(c) {
    this.conn = c;
    c.on('open', () => { this.ready = true; clearTimeout(this.joinTimer); if (this.onOpen) this.onOpen(); });
    c.on('data', d => { if (this.onMsg) this.onMsg(d); });
    c.on('close', () => this.lost());
    c.on('error', () => this.lost());
  },

  // two tabs of the same browser talk through a BroadcastChannel in test mode
  testChannel(code, host) {
    const ch = new BroadcastChannel('cosmopool-' + code), me = host ? 'h' : 'g';
    this.chan = ch;
    ch.onmessage = e => {
      const m = e.data;
      if (!m || m.from === me) return;
      if (m.hello) {
        if (!this.ready) {
          this.ready = true; clearTimeout(this.joinTimer); clearInterval(this.helloTimer);
          if (host) ch.postMessage({ from: me, hello: 1 });
          if (this.onOpen) this.onOpen();
        }
        return;
      }
      if (m.bye) { this.lost(); return; }
      if (this.onMsg) this.onMsg(m.d);
    };
    if (!host) {
      const hi = () => ch.postMessage({ from: me, hello: 1 });
      hi(); this.helloTimer = setInterval(hi, 700);
    }
  },

  send(o) {
    if (!this.ready) return;
    if (this.chan) this.chan.postMessage({ from: this.isHost ? 'h' : 'g', d: o });
    else if (this.conn) { try { this.conn.send(o); } catch (e) {} }
  },
  lost() { if (!this.ready) return; this.ready = false; if (this.onClose) this.onClose(); },
  fail(type) { if (this.onError) this.onError(type || 'error'); },
  close() {
    const wasReady = this.ready;
    this.ready = false;
    clearTimeout(this.joinTimer); clearInterval(this.helloTimer);
    try { if (this.chan && wasReady) this.chan.postMessage({ from: this.isHost ? 'h' : 'g', bye: 1 }); } catch (e) {}
    try { if (this.conn) this.conn.close(); } catch (e) {}
    try { if (this.peer) this.peer.destroy(); } catch (e) {}
    try { if (this.chan) this.chan.close(); } catch (e) {}
    this.conn = null; this.peer = null; this.chan = null;
  }
};
