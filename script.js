(() => {
  // ============================================================
  // 0. TEAM DATA — names/IDs stored encoded (decoded at runtime)
  // ============================================================
  const _T = [
    null, // index 0 unused — pids start at 1
    { n: 'UkFIQUpBU09OIEF1ZHJleQ==',                  i: 'IzQ2MDY=' }, // 1
    { n: 'QU5EUklBTkFSSVZPTlkgVG9reSBBcm9uaWFpbmE=',  i: 'IzQ2MDg=' }, // 2
    { n: 'UklWT01BTkFOVElBUkFZIE1pb3JhIE55IEFpbmE=',  i: 'IzQ2MDk=' }, // 3
    { n: 'RkVUSVNPTiBNaW9yYWxhbGFpbmEgQ2FsaW5l',      i: 'IzQ2MTA=' }, // 4
    { n: 'QU5EUklBTkpBUkEgSmFjb2IgUmlubw==',          i: 'IzQ2MTE=' }  // 5
  ];
  const _d = (b) => { try { return atob(b); } catch (e) { return ''; } };

  const populateTeam = () => {
    // Cover team list
    const list = document.querySelector('[data-team-list]');
    if (list) {
      list.innerHTML = '';
      for (let k = 1; k < _T.length; k++) {
        const li = document.createElement('li');
        const s1 = document.createElement('span');
        const s2 = document.createElement('span');
        s2.className = 'num';
        s1.textContent = _d(_T[k].n);
        s2.textContent = _d(_T[k].i);
        li.appendChild(s1); li.appendChild(s2);
        list.appendChild(li);
      }
    }
    // Presenter badges
    document.querySelectorAll('.presenter-badge[data-pid]').forEach(el => {
      const pid = parseInt(el.dataset.pid, 10);
      const t = _T[pid];
      if (!t) return;
      const n = el.querySelector('.pb-name');
      const i = el.querySelector('.pb-num');
      if (n) n.textContent = _d(t.n);
      if (i) i.textContent = _d(t.i);
    });
  };
  populateTeam();

  // ============================================================
  // 1. REMOTE MODE — phone side, controls the host
  // ============================================================
  const urlParams = new URLSearchParams(window.location.search);
  const remoteHostId = urlParams.get('remote');

  if (remoteHostId) {
    initRemoteMode(remoteHostId);
    return; // skip deck logic entirely
  }

  // ============================================================
  // 2. HOST (deck) mode — laptop showing the slides
  // ============================================================
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  const progressFill = document.getElementById('progressFill');
  const currentEl = document.getElementById('currentSlide');
  const totalEl = document.getElementById('totalSlides');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const fsBtn = document.getElementById('fsBtn');
  const qrBtn = document.getElementById('qrBtn');

  totalEl.textContent = total;

  let index = 0;
  let isAnimating = false;
  let hostConnections = [];

  const goTo = (newIndex) => {
    if (isAnimating) return;
    if (newIndex < 0 || newIndex >= total || newIndex === index) return;
    isAnimating = true;
    slides[index].classList.remove('active');
    index = newIndex;
    slides[index].classList.add('active');
    currentEl.textContent = index + 1;
    progressFill.style.width = `${((index + 1) / total) * 100}%`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;
    broadcastState();
    setTimeout(() => { isAnimating = false; }, 500);
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  progressFill.style.width = `${(1 / total) * 100}%`;
  prevBtn.disabled = true;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault(); next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault(); prev();
    } else if (e.key === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); goTo(total - 1);
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (/^[0-9]$/.test(e.key)) {
      const target = parseInt(e.key, 10) - 1;
      if (target >= 0 && target < total) goTo(target);
    }
  });

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };
  fsBtn.addEventListener('click', toggleFullscreen);

  // ------- Touch swipe -------
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  // ------- Wheel -------
  let wheelLock = false;
  document.addEventListener('wheel', (e) => {
    const active = slides[index];
    if (active.scrollHeight > active.clientHeight) return;
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 30) return;
    wheelLock = true;
    if (e.deltaY > 0) next(); else prev();
    setTimeout(() => { wheelLock = false; }, 700);
  }, { passive: true });

  // ============================================================
  // 3. QR / PEERJS — host side
  // ============================================================
  const qrModal = document.getElementById('qrModal');
  const qrClose = document.getElementById('qrClose');
  const qrImage = document.getElementById('qrImage');
  const qrStatus = document.getElementById('qrStatus');
  const qrUrlEl = document.getElementById('qrUrl');

  let peer = null;
  let peerReady = false;

  const initPeer = () => {
    if (peer) return Promise.resolve(peer.id);
    return new Promise((resolve, reject) => {
      try {
        peer = new Peer();
      } catch (err) {
        reject(err); return;
      }
      peer.on('open', (id) => {
        peerReady = true;
        // Wait for incoming connections from the phone
        peer.on('connection', (conn) => {
          hostConnections.push(conn);
          conn.on('open', () => {
            qrStatus.textContent = 'phone connected ✓';
            qrStatus.className = 'qr-status connected';
            broadcastState();
          });
          conn.on('data', (msg) => {
            if (!msg || typeof msg !== 'object') return;
            switch (msg.cmd) {
              case 'next':  next(); break;
              case 'prev':  prev(); break;
              case 'first': goTo(0); break;
              case 'last':  goTo(total - 1); break;
              case 'fullscreen': toggleFullscreen(); break;
              case 'goto':
                if (typeof msg.index === 'number') goTo(msg.index);
                break;
            }
          });
          conn.on('close', () => {
            hostConnections = hostConnections.filter(c => c !== conn);
          });
        });
        resolve(id);
      });
      peer.on('error', (err) => {
        console.error('peer error', err);
        qrStatus.textContent = 'peer error: ' + (err.type || 'unknown');
        qrStatus.className = 'qr-status';
      });
    });
  };

  const broadcastState = () => {
    const state = { cmd: 'state', index, total };
    hostConnections.forEach(c => {
      try { c.send(state); } catch (e) { /* ignore */ }
    });
  };

  const showQR = async () => {
    qrModal.classList.add('show');
    qrImage.innerHTML = '<div class="qr-spinner">connecting…</div>';
    qrStatus.textContent = 'starting peer connection…';
    qrStatus.className = 'qr-status';
    qrUrlEl.textContent = '';

    try {
      const id = await initPeer();
      const base = window.location.origin + window.location.pathname;
      const url  = `${base}?remote=${id}`;
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=${encodeURIComponent(url)}`;

      const img = new Image();
      img.alt = 'remote QR';
      img.onload = () => {
        qrImage.innerHTML = '';
        qrImage.appendChild(img);
      };
      img.onerror = () => {
        qrImage.innerHTML = '<div class="qr-spinner">QR generation failed.<br/>Use the URL below.</div>';
      };
      img.src = qrApi;

      qrStatus.textContent = 'waiting for phone…';
      qrStatus.className = 'qr-status ready';
      qrUrlEl.textContent = url;
    } catch (err) {
      qrStatus.textContent = 'unable to start peer.';
      qrStatus.className = 'qr-status';
      console.error(err);
    }
  };

  qrBtn.addEventListener('click', showQR);
  qrClose.addEventListener('click', () => qrModal.classList.remove('show'));
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.remove('show');
  });

  // ============================================================
  // REMOTE MODE INIT (phone side)
  // ============================================================
  function initRemoteMode(hostId) {
    document.body.classList.add('remote-mode');
    const statusEl = document.getElementById('remoteStatus');
    const slideEl  = document.getElementById('remoteSlide');
    const rPrev    = document.getElementById('rPrev');
    const rNext    = document.getElementById('rNext');
    const rFirst   = document.getElementById('rFirst');
    const rLast    = document.getElementById('rLast');
    const rFs      = document.getElementById('rFs');

    let conn = null;
    const peer = new Peer();

    peer.on('open', () => {
      statusEl.textContent = 'connecting to host…';
      conn = peer.connect(hostId, { reliable: true });

      conn.on('open', () => {
        statusEl.textContent = 'connected ✓';
        statusEl.className = 'remote-status ready';
      });
      conn.on('data', (msg) => {
        if (msg && msg.cmd === 'state') {
          slideEl.textContent = `slide ${msg.index + 1} / ${msg.total}`;
        }
      });
      conn.on('close', () => {
        statusEl.textContent = 'disconnected';
        statusEl.className = 'remote-status error';
      });
      conn.on('error', () => {
        statusEl.textContent = 'connection error';
        statusEl.className = 'remote-status error';
      });
    });

    peer.on('error', (err) => {
      statusEl.textContent = 'peer error: ' + (err.type || 'unknown');
      statusEl.className = 'remote-status error';
    });

    const send = (msg) => {
      if (conn && conn.open) {
        try { conn.send(msg); } catch (e) { /* ignore */ }
      }
    };

    rPrev .addEventListener('click', () => send({ cmd: 'prev' }));
    rNext .addEventListener('click', () => send({ cmd: 'next' }));
    rFirst.addEventListener('click', () => send({ cmd: 'first' }));
    rLast .addEventListener('click', () => send({ cmd: 'last' }));
    rFs   .addEventListener('click', () => send({ cmd: 'fullscreen' }));
  }
})();
