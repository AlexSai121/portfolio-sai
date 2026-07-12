// Dynamically generate static noise PNG background to replace slow SVG filter repaints
(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(128, 128);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 11;
    data[i] = Math.max(0, Math.min(255, 244 + noise));
    data[i+1] = Math.max(0, Math.min(255, 241 + noise));
    data[i+2] = Math.max(0, Math.min(255, 232 + noise));
    data[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const url = canvas.toDataURL();
  
  const style = document.createElement('style');
  style.textContent = `section.light { background-image: url(${url}) !important; }`;
  document.head.appendChild(style);
})();

// Global layout cache to prevent layout thrashing on scroll
const layoutCache = {
  windowHeight: 0,
  scrollHeight: 0,
  researchTop: 0,
  researchHeight: 0,
  stmtParentBottom: 0,
  workSecOffsetTop: 0,
  skillsTop: 0,
  skillsHeight: 0,
  themedSections: [],
  ssImgs: [],
  workReveals: [],

  cache() {
    const scrollY = window.scrollY || window.pageYOffset;
    this.windowHeight = window.innerHeight;
    this.scrollHeight = document.body.scrollHeight;

    const research = document.getElementById('research');
    if (research) {
      const rRect = research.getBoundingClientRect();
      this.researchTop = rRect.top + scrollY;
      this.researchHeight = rRect.height;
    }

    const stmtLines = document.querySelectorAll('.hero-statement p');
    if (stmtLines.length) {
      const parent = stmtLines[stmtLines.length - 1].parentElement;
      this.stmtParentBottom = parent.getBoundingClientRect().bottom + scrollY;
    }

    const workSec = document.getElementById('work');
    if (workSec) {
      const origTransform = workSec.style.transform;
      workSec.style.transform = '';
      this.workSecOffsetTop = workSec.getBoundingClientRect().top + scrollY;
      workSec.style.transform = origTransform;
    }

    const skills = document.getElementById('skills');
    if (skills) {
      const sRect = skills.getBoundingClientRect();
      this.skillsTop = sRect.top + scrollY;
      this.skillsHeight = sRect.height;
    }

    const themedSections = [...document.querySelectorAll('section.light, section.dark')];
    this.themedSections = themedSections.map(s => {
      const rect = s.getBoundingClientRect();
      return {
        el: s,
        id: s.id,
        isLight: s.classList.contains('light'),
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY
      };
    });

    const ssImgs = [...document.querySelectorAll('.ss-img')];
    this.ssImgs = ssImgs.map(el => {
      const rect = el.getBoundingClientRect();
      return {
        el: el,
        top: rect.top + scrollY
      };
    });

    // NOTE: .ps-media lives inside the sticky #projects — its doc position
    // depends on the pin state, so it is measured live per frame instead.

    const workSecEl = document.getElementById('work');
    const origT = workSecEl ? workSecEl.style.transform : '';
    if (workSecEl) workSecEl.style.transform = ''; // measure lag-free positions
    const workReveals = [...document.querySelectorAll('#work .reveal:not(.in)')];
    this.workReveals = workReveals.map(el => {
      const rect = el.getBoundingClientRect();
      return {
        el: el,
        top: rect.top + scrollY
      };
    });
    if (workSecEl) workSecEl.style.transform = origT;
  }
};

// — ASCII hero: image → glyph grid with ambient motion + click ripples —
(() => {
  const cv = document.getElementById('hero-ascii');
  const hero = document.querySelector('.hero-section');
  if (!cv || !hero) return;
  const ctx = cv.getContext('2d');
  const cols = 160, rows = 90;
  const CELL_X = 14.4, CELL_Y = 24;
  const RAMP = ' .:-=+*#%@';
  let px, baseLum, heat, w, h;
  let rafId = 0, lastFrame = 0;
  const ripples = [];

  const img = new Image();
  img.src = 'banners/205757.jpg';

  function build() {
    if (!img.naturalWidth || !img.naturalHeight) return;
    w = cols * CELL_X; h = rows * CELL_Y;
    cv.width = w; cv.height = h;
    heat = new Float32Array(cols * rows);
    // sample the image at grid resolution, cover-cropped
    const s = document.createElement('canvas');
    s.width = cols; s.height = rows;
    const sc = s.getContext('2d');
    const f = Math.max(cols / img.width, rows / img.height);
    sc.drawImage(img, (cols - img.width*f)/2, (rows - img.height*f)/2, img.width*f, img.height*f);
    try {
      px = sc.getImageData(0, 0, cols, rows).data;
    } catch (e) {
      // tainted canvas (opened via file://) — fall back to the plain image
      cv.style.background = "url('banners/205757.jpg') center 40% / cover no-repeat";
      return;
    }
    baseLum = new Float32Array(cols * rows);
    let tr = 0, tg = 0, tb = 0;
    for (let i = 0; i < cols * rows; i++) {
      const r = px[i*4], g = px[i*4+1], b = px[i*4+2];
      baseLum[i] = ((0.2126*r + 0.7152*g + 0.0722*b) / 255) ** 0.7;
      tr += r; tg += g; tb += b;
    }
    // the chosen backdrop lends its color to the rest of the page
    const n = cols * rows, dk = 0.62; // darkened so it reads on parchment
    document.documentElement.style.setProperty('--backdrop-tint',
      `${(tr / n * dk) | 0},${(tg / n * dk) | 0},${(tb / n * dk) | 0}`);
    dispatchEvent(new Event('backdroptint'));
    ctx.font = '24px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function addGlow(cx, cy, radius, strength) {
    if (!px) return;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const d = Math.hypot(dx, dy) / radius;
      if (d > 1) continue;
      const i = y * cols + x;
      heat[i] = Math.max(heat[i], ((1 - d) ** 2) * strength);
    }
  }

  function addRipple(cx, cy) {
    ripples.push({ x: cx, y: cy, start: performance.now(), strength: 0.95 });
    if (ripples.length > 6) ripples.shift();
  }

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    if (!px) return;
    if (t - lastFrame < 33) return; // ~30fps
    lastFrame = t;

    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, w, h);

    for (let r = ripples.length - 1; r >= 0; r--) {
      if ((t - ripples[r].start) > 1500) ripples.splice(r, 1);
    }

    let lastColor = '';

    for (let y = 0; y < rows; y++) {
      const rowOffset = y * cols;
      const drawY = y * CELL_Y;
      for (let x = 0; x < cols; x++) {
        const i = rowOffset + x;
        const ambient = (Math.sin(t * 0.0015 + x * 0.28 + y * 0.16) + Math.sin(t * 0.0011 + x * 0.1 - y * 0.23)) * 0.03;
        let rippleBoost = 0;

        for (let r = 0; r < ripples.length; r++) {
          const rp = ripples[r];
          const age = (t - rp.start) / 1000;
          const radius = age * 14;
          const dist = Math.hypot(x - rp.x, y - rp.y);
          const band = Math.abs(dist - radius);
          if (band < 1.8) rippleBoost += (1 - band / 1.8) * rp.strength * (1 - age / 1.5);
        }

        const boost = Math.max(0, heat[i] + ambient + rippleBoost);
        heat[i] *= 0.92;

        const lum = Math.max(0.08, baseLum[i]);
        const idx = Math.min(RAMP.length - 1, Math.round(lum * (1 + boost) * (RAMP.length - 1)));
        if (idx === 0) continue; // Skip spaces entirely

        const r = px[i*4], g = px[i*4+1], b = px[i*4+2];
        const k = boost * 0.9, lift = 1.35;
        const red = (r*lift + (255-r)*k) | 0;
        const green = (g*lift + (255-g)*k) | 0;
        const blue = (b*lift + (255-b)*k) | 0;

        const color = `rgb(${red > 255 ? 255 : red},${green > 255 ? 255 : green},${blue > 255 ? 255 : blue})`;
        if (color !== lastColor) {
          ctx.fillStyle = color;
          lastColor = color;
        }
        ctx.fillText(RAMP[idx], x * CELL_X, drawY);
      }
    }
  }

  // live rect per event: the hero drifts on scroll, animates scale, and
  // zoom resizes it — a rect cached at pointerenter goes stale immediately
  hero.addEventListener('pointermove', e => {
    const rect = cv.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width * cols;
    const cy = (e.clientY - rect.top) / rect.height * rows;
    addGlow(cx, cy, 6, 1);
  }, { passive: true });

  hero.addEventListener('click', e => {
    if (!px) return;
    const rect = cv.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width * cols;
    const cy = (e.clientY - rect.top) / rect.height * rows;
    addGlow(cx, cy, 9, 1.2);
    addRipple(cx, cy);
  });

  img.onerror = () => {
    cv.style.background = `url('${img.src}') center 40% / cover no-repeat`;
  };
  img.onload = () => { build(); cv.style.opacity = '1'; };
  if (img.complete && img.naturalWidth > 0) build();

  // photo picker hooks in here: fade out, swap source, rebuild, fade in
  window.setHeroImage = src => {
    cv.style.opacity = '0';
    setTimeout(() => { img.src = src; }, 350);
  };
})();

// — hero photo picker —
(() => {
  const BANNERS = ['205757.jpg', '1875.jpg', '2610.jpg', '2998.jpg', '2999.jpg', '3007.jpg', '6992129.jpg'];
  const picker = document.getElementById('photo-picker');
  const btn = document.getElementById('pp-btn');
  const menu = document.getElementById('pp-menu');
  if (!picker) return;

  BANNERS.forEach((f, i) => {
    const t = new Image();
    t.src = 'banners/' + f;
    t.alt = '';
    t.style.transitionDelay = (i * 45) + 'ms'; // stagger the drop-in
    if (i === 0) t.classList.add('active');
    t.addEventListener('click', () => {
      menu.querySelector('.active')?.classList.remove('active');
      t.classList.add('active');
      window.setHeroImage(t.src);
      picker.classList.remove('open');
    });
    menu.appendChild(t);
  });

  btn.addEventListener('click', () => picker.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!picker.contains(e.target)) picker.classList.remove('open');
  });
})();

// — hero statement: wrap words so they can wave with staggered delays —
document.querySelectorAll('.hero-statement p').forEach(p => {
  p.innerHTML = p.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
  p.querySelectorAll('.w').forEach((w, i) => w.style.animationDelay = (i * 0.12) + 's');
});

// — local time (monolog-style footer clock) —
const clock = document.getElementById('clock');
const tick = () => clock.textContent = new Date().toLocaleTimeString('en-US',
  { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';
tick(); setInterval(tick, 30000);

// — scroll reveal —
const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal, .fold').forEach(el => io.observe(el));

// — research images: hand the inline background to the parallax layer —
document.querySelectorAll('.ss-img').forEach(card => {
  const bg = card.style.backgroundImage;
  if (bg) {
    card.style.setProperty('--ss-bg', bg);
    card.style.backgroundImage = 'none';
  }
});

// — liquid glass cursor over research images: lerp inertia + velocity squash.
//   The same rAF loop eases each card's --hover vars so the image glides
//   instead of jumping (no CSS transition fighting scroll updates).
(() => {
  const cur = document.getElementById('liquid-cursor');
  const targets = document.querySelectorAll('.ss-img, .ps-media');
  if (!cur || !targets.length) return;

  const pos = { x: 0, y: 0 }, aim = { x: 0, y: 0 };
  let scale = 0, aimScale = 0, rafId = 0;
  const hover = new Map();
  targets.forEach(el => hover.set(el, { x: 0, y: 0, tx: 0, ty: 0, lastWrittenX: null, lastWrittenY: null }));

  const loop = () => {
    pos.x += (aim.x - pos.x) * 0.24;
    pos.y += (aim.y - pos.y) * 0.24;
    scale += (aimScale - scale) * 0.17;
    let busy = aimScale > 0 || Math.abs(aimScale - scale) > 0.004;

    const vx = aim.x - pos.x, vy = aim.y - pos.y;
    const squash = Math.min(0.28, Math.hypot(vx, vy) / 300);
    const ang = Math.atan2(vy, vx);
    cur.style.transform =
      `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) ` +
      `rotate(${ang}rad) scale(${scale * (1 + squash)}, ${scale * (1 - squash)}) rotate(${-ang}rad)`;

    hover.forEach((s, el) => {
      if (Math.abs(s.tx - s.x) < 0.001 && Math.abs(s.ty - s.y) < 0.001) {
        s.x = s.tx;
        s.y = s.ty;
      } else {
        s.x += (s.tx - s.x) * 0.11;
        s.y += (s.ty - s.y) * 0.11;
      }

      if (s.x !== s.lastWrittenX || s.y !== s.lastWrittenY) {
        el.style.setProperty('--hover-x', s.x.toFixed(4));
        el.style.setProperty('--hover-y', s.y.toFixed(4));
        s.lastWrittenX = s.x;
        s.lastWrittenY = s.y;
      }

      if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) > 0.004) busy = true;
    });

    rafId = busy ? requestAnimationFrame(loop) : 0;
  };
  const wake = () => { if (!rafId) rafId = requestAnimationFrame(loop); };

  // live rect per event: cards move with scroll parallax and zoom
  const aimCard = (el, e) => {
    const s = hover.get(el);
    const r = el.getBoundingClientRect();
    s.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    s.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };

  targets.forEach(el => {
    el.addEventListener('pointerenter', e => {
      if (scale < 0.05) { pos.x = e.clientX; pos.y = e.clientY; } // spawn under pointer
      aim.x = e.clientX; aim.y = e.clientY;
      aimScale = 1;
      aimCard(el, e);
      wake();
    });
    el.addEventListener('pointermove', e => {
      aim.x = e.clientX; aim.y = e.clientY;
      aimCard(el, e);
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      aimScale = 0;
      const s = hover.get(el); s.tx = 0; s.ty = 0;
      wake();
    });
    el.addEventListener('click', () => {
      const href = el.dataset.href;
      if (href && href !== '#') location.href = href;
    });
  });
})();


// — terminal contact: /start guided flow, or power-user commands —
(() => {
  const term = document.getElementById('term');
  const body = document.getElementById('term-body');
  const input = document.getElementById('term-input');
  const promptEl = document.getElementById('term-prompt');
  if (!term) return;

  const EMAIL = 'tips01@udayton.edu';
  const state = { step: null, name: '', email: '', msg: '' };
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const line = (html, cls = '') => {
    const d = document.createElement('div');
    d.className = ('term-line ' + cls).trim();
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  };
  const setPrompt = () => {
    promptEl.textContent = (state.name ? state.name.trim().toLowerCase().replace(/\s+/g, '-') : 'guest') + '@sai:~$';
  };
  const EMAIL_RE = /^\S+@\S+\.\S+$/;

  const send = async () => {
    if (!state.msg) return line('nothing staged — <b>/start</b> or <b>/message</b> first', 'term-err');
    if (!state.email) return line('need a reply address — <b>/usergmail you@gmail.com</b>', 'term-err');
    line('sending…', 'term-dim');
    try {
      const r = await fetch('https://formsubmit.co/ajax/' + EMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: state.name || 'anonymous', email: state.email, message: state.msg })
      });
      if (!r.ok) throw 0;
      line('✓ delivered to my inbox. I read everything — talk soon.', 'term-ok');
      state.msg = '';
    } catch {
      line('network said no — opening your mail app instead…', 'term-err');
      location.href = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent('Hello from ' + (state.name || 'your portfolio')) +
        '&body=' + encodeURIComponent(state.msg + '\n\n— ' + (state.name || 'anonymous') + ' (' + state.email + ')');
    }
  };

  const HELP = [
    ['/start', 'guided contact — name, email, message'],
    ['/username &lt;name&gt;', 'set your name'],
    ['/usergmail &lt;email&gt;', 'set your reply address'],
    ['/message &lt;text&gt;', 'stage a message'],
    ['/send', 'deliver it'],
    ['/whoami', 'who you are talking to'],
    ['/skills', 'quick capability dump'],
    ['/clear', 'wipe the screen']
  ];

  const exec = raw => {
    const t = raw.trim();
    if (!t) return;
    line(`<span class="term-dim">${promptEl.textContent}</span> ${esc(t)}`);

    // guided steps
    if (state.step === 'name') {
      state.name = t; setPrompt(); state.step = 'email';
      return line(`hi <b>${esc(t)}</b> — and your email, so I can reply?`);
    }
    if (state.step === 'email') {
      if (!EMAIL_RE.test(t)) return line('that does not look like an email — try again', 'term-err');
      state.email = t; state.step = 'msg';
      return line('got it. now the message — say anything:');
    }
    if (state.step === 'msg') {
      state.msg = t; state.step = 'confirm';
      return line('send it? <b>y</b> / <b>n</b>');
    }
    if (state.step === 'confirm') {
      state.step = null;
      return t.toLowerCase().startsWith('y') ? send() : line('discarded. /start to retry.', 'term-dim');
    }

    const [cmd, ...rest] = t.split(' ');
    const arg = rest.join(' ').trim();
    switch (cmd.toLowerCase()) {
      case '/start':
        state.step = 'name';
        line('alright — what should I call you?');
        break;
      case '/username':
        if (arg) { state.name = arg; setPrompt(); line(`name set: <b>${esc(arg)}</b>`); }
        else line('usage: /username Ada Lovelace', 'term-err');
        break;
      case '/usergmail':
      case '/useremail':
        if (EMAIL_RE.test(arg)) { state.email = arg; line(`reply address set: <b>${esc(arg)}</b>`); }
        else line('usage: /usergmail you@gmail.com', 'term-err');
        break;
      case '/message':
        if (arg) { state.msg = arg; line('message staged — <b>/send</b> when ready'); }
        else line('usage: /message your text here', 'term-err');
        break;
      case '/send': send(); break;
      case '/help': HELP.forEach(([c, d]) => line(`<b>${c}</b> <span class="term-dim">— ${d}</span>`)); break;
      case '/clear': body.innerHTML = ''; break;
      case '/whoami':
        line('CS junior @ University of Dayton. AI security. Hunts deepfakes, builds things at 2am.');
        break;
      case '/skills':
        line('PyTorch · Librosa · computer vision · RAG · agentic workflows · Figma · FL Studio', 'term-dim');
        break;
      case 'sudo':
        line('nice try. permission denied — this is my portfolio ;)', 'term-err');
        break;
      default:
        line(`command not found: ${esc(cmd)} — try <b>/help</b>`, 'term-err');
    }
  };

  // alive: the terminal notices when you wander off mid-conversation
  let lastAct = 0, idleSaid = false;
  input.addEventListener('keydown', e => {
    lastAct = Date.now(); idleSaid = false;
    if (e.key === 'Enter') { exec(input.value); input.value = ''; }
  });
  setInterval(() => {
    if (!lastAct || idleSaid) return;
    if (Date.now() - lastAct > 40000) {
      idleSaid = true;
      line('… still here. <b>/help</b> if you got lost.', 'term-dim');
    }
  }, 5000);
  term.addEventListener('click', () => input.focus());
})();

// — for the curious ones who open devtools —
console.log(
  '%cSAI WOON TIP',
  'font: 700 22px "Instrument Sans", sans-serif; letter-spacing: 3px;',
  '\nbuilt by hand — vanilla JS, ASCII from live canvases, no frameworks.' +
  '\nsay hi: the contact section has a real terminal. try /start'
);

// — projects slider —
(() => {
  const track = document.getElementById('ps-track');
  if (!track) return;
  const tabs = [...document.querySelectorAll('.ps-tab')];
  const n = track.children.length;
  let i = 0;
  const go = k => {
    i = (k + n) % n;
    track.style.transform = `translateX(calc(${i} * (-100% - 20px)))`;
    tabs.forEach((t, j) => t.classList.toggle('active', j === i));
    [...track.children].forEach((s, j) => s.classList.toggle('active', j === i)); // gates the text reveal
  };
  document.getElementById('ps-prev').addEventListener('click', () => go(i - 1));
  document.getElementById('ps-next').addEventListener('click', () => go(i + 1));
  tabs.forEach((t, j) => t.addEventListener('click', () => go(j)));
  go(0);

  // alive: the slider drifts on its own while on screen, defers to hands
  let auto = 0, hovered = false;
  const slider = track.closest('.proj-slider') || track;
  const arm = () => { clearInterval(auto); auto = setInterval(() => { if (!hovered && !document.hidden) go(i + 1); }, 6000); };
  slider.addEventListener('pointerenter', () => hovered = true);
  slider.addEventListener('pointerleave', () => hovered = false);
  new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) arm(); else clearInterval(auto);
  }), { threshold: 0.35 }).observe(slider);
})();

// — work section: ambient ascii field (ASMR drift + pointer warmth) —
(() => {
  const sec = document.getElementById('work');
  if (!sec) return;
  const cv = document.createElement('canvas');
  cv.className = 'work-ascii';
  cv.setAttribute('aria-hidden', 'true');
  sec.prepend(cv);
  const ctx = cv.getContext('2d');
  const cols = 100, rows = 60;
  const CELL_X = 16, CELL_Y = 28;
  const RAMP = ' ..·:;+*#';
  let heat, w, h, rafId = 0, last = 0;

  const size = () => {
    w = cols * CELL_X; h = rows * CELL_Y;
    cv.width = w; cv.height = h;
    heat = new Float32Array(cols * rows);
    ctx.font = '28px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(10,10,10,0.34)';
  };

  const frame = t => {
    rafId = requestAnimationFrame(frame);
    if (t - last < 50) return; // ~20fps
    last = t;
    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) {
      const rowOffset = y * cols;
      const drawY = y * CELL_Y;
      for (let x = 0; x < cols; x++) {
        const i = rowOffset + x;
        const v = Math.sin(t * 0.00035 + x * 0.22 + Math.sin(y * 0.19 + t * 0.0002) * 1.6)
                + Math.sin(t * 0.00028 - x * 0.13 + y * 0.24);
        const val = Math.max(0, v * 0.25 + heat[i]);
        heat[i] *= 0.94;
        const idx = Math.min(RAMP.length - 1, (val * RAMP.length) | 0);
        if (idx > 0) ctx.fillText(RAMP[idx], x * CELL_X, drawY);
      }
    }
  };

  sec.addEventListener('pointermove', e => {
    if (!cols) return;
    const r = cv.getBoundingClientRect(); // live: section shifts and zooms
    const cx = (e.clientX - r.left) / r.width * cols;
    const cy = (e.clientY - r.top) / r.height * rows;
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const d = Math.hypot(dx, dy) / 5;
      if (d > 1) continue;
      const i = y * cols + x;
      heat[i] = Math.max(heat[i], (1 - d) ** 2 * 0.9);
    }
  }, { passive: true });

  // only burn frames while the section is on screen
  new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { if (!rafId) rafId = requestAnimationFrame(frame); }
    else if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  })).observe(sec);

  size();
})();

// — skills: The Creation (of Adam) — human hand meets machine hand in ASCII.
// Static render (the motion is the scroll-driven slide); the cold marble
// background is keyed out so only the warm flesh/brass becomes glyphs, and
// the glyph color leans toward whichever backdrop is selected in the hero.
(() => {
  const cvLeft = document.getElementById('skills-ascii-left');
  const cvRight = document.getElementById('skills-ascii-right');
  const sec = document.getElementById('skills');
  if (!cvLeft || !cvRight || !sec) return;

  const CELL = 12, RAMP = ' .:-=+*#%@';
  const img = new Image();
  img.src = 'banners/hands.jpg';

  const tintOf = () => {
    const t = getComputedStyle(document.documentElement).getPropertyValue('--backdrop-tint').trim();
    return t ? t.split(',').map(Number) : [92, 76, 58];
  };

  const renderHalf = (cv, half) => {
    const cw = cv.clientWidth || sec.clientWidth / 2;
    const ch = cv.clientHeight || sec.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = cw * dpr; cv.height = ch * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = CELL + 'px ui-monospace, monospace';
    ctx.textBaseline = 'top';

    const cols = Math.ceil(cw / CELL), rows = Math.ceil(ch / CELL);
    const hw = img.width / 2;
    const gh = Math.round(img.height * (cols / hw)); // arm spans the half's width
    const y0 = ((rows - gh) / 2) | 0;                // vertically centred

    const s = document.createElement('canvas');
    s.width = cols; s.height = rows;
    const sc = s.getContext('2d');
    sc.drawImage(img, half * hw, 0, hw, img.height, 0, y0, cols, gh);
    let px;
    try { px = sc.getImageData(0, 0, cols, rows).data; } catch { return; }

    // on a dark section the glyphs must glow, on parchment they must stain
    const dark = sec.classList.contains('dark');
    const lift = dark ? 2.6 : 1;
    let [tr, tg, tb] = tintOf().map(v => Math.min(255, v * lift));
    ctx.clearRect(0, 0, cw, ch);
    let last = '';
    for (let i = 0; i < cols * rows; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      if (r < b + 24) continue; // key out the marble — keep warm flesh and brass
      const lum = ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) ** 0.75;
      const idx = Math.min(RAMP.length - 1, Math.round(lum * (RAMP.length - 1)));
      if (idx <= 0) continue;
      const k = dark ? Math.min(255 / 190, 1 + lum * 0.4) : 1;
      const cr = Math.min(255, (r * 0.45 + tr * 0.55) * k) | 0,
            cg = Math.min(255, (g * 0.45 + tg * 0.55) * k) | 0,
            cb = Math.min(255, (b * 0.45 + tb * 0.55) * k) | 0;
      const col = `rgb(${cr},${cg},${cb})`;
      if (col !== last) { ctx.fillStyle = col; last = col; }
      ctx.fillText(RAMP[idx], (i % cols) * CELL, ((i / cols) | 0) * CELL);
    }
  };

  const render = () => {
    if (!img.naturalWidth) return;
    renderHalf(cvLeft, 0);
    renderHalf(cvRight, 1);
  };
  img.onload = render;
  if (img.complete && img.naturalWidth > 0) render();
  addEventListener('backdroptint', render); // re-tint when the backdrop changes
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 200); });
})();

// — alive: magnetic controls lean toward the cursor —
document.querySelectorAll('.nav-cta, .ps-arrow, .pp-btn').forEach(el => {
  el.classList.add('magnetic');
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.translate =
      `${(((e.clientX - r.left) / r.width) - 0.5) * 8}px ` +
      `${(((e.clientY - r.top) / r.height) - 0.5) * 6}px`;
  });
  el.addEventListener('pointerleave', () => { el.style.translate = '0px 0px'; });
});

// — alive: scroll mass — headings trail the scroll velocity, then settle —
(() => {
  let lastY = scrollY, sv = 0, raf = 0;
  const rs = document.documentElement.style;
  const loop = () => {
    const v = scrollY - lastY;
    lastY = scrollY;
    sv += (Math.max(-36, Math.min(36, v)) - sv) * 0.1;
    if (Math.abs(sv) < 0.05 && !v) { sv = 0; rs.setProperty('--vel', '0'); raf = 0; return; }
    rs.setProperty('--vel', sv.toFixed(2));
    raf = requestAnimationFrame(loop);
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
})();

// — the library: pull a volume from the shelf to open it —
(() => {
  const shelf = document.getElementById('shelf');
  if (!shelf) return;
  const books = [...shelf.querySelectorAll('.book')];
  const open = b => books.forEach(x => {
    const on = x === b;
    x.classList.toggle('active', on);
    x.setAttribute('aria-expanded', on);
  });
  books.forEach(b => {
    b.addEventListener('click', () => open(b));
    b.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(b); }
    });
  });
})();

// — projects curtain pin: sticks once its bottom reaches the viewport bottom —
(() => {
  const proj = document.getElementById('projects');
  if (!proj) return;
  const pin = () => { proj.style.top = Math.min(0, innerHeight - proj.offsetHeight) + 'px'; };
  addEventListener('resize', pin);
  addEventListener('load', pin);
  pin();
})();

// — parallax (ponytail: one listener, CSS does the rest) —
const hero = document.querySelector('.hero-section');
const research = document.getElementById('research');
const navEl = document.querySelector('nav');
const themedSections = [...document.querySelectorAll('section.light, section.dark')];
const stmtLines = document.querySelectorAll('.hero-statement p');
const ssImgs = [...document.querySelectorAll('.ss-img')];
const psMedias = [...document.querySelectorAll('.ps-media')];
const workSec = document.getElementById('work');
const skillsSec = document.getElementById('skills');
const skillsCvL = document.getElementById('skills-ascii-left');
const skillsCvR = document.getElementById('skills-ascii-right');
let ticking = false;
let touchFired = false;

const updateNavTheme = () => {
  // nav sits at padding 20px; sample just below it to see what's underneath.
  // Later sections paint over the sticky hero, so take the LAST match.
  // Live rects here: sticky/pinned sections make cached doc coords lie.
  const probeY = 30;
  let under;
  for (const s of layoutCache.themedSections) {
    const r = s.el.getBoundingClientRect();
    if (r.top <= probeY && r.bottom > probeY) under = s;
  }
  navEl.dataset.theme = under && under.isLight ? 'light' : 'dark';
  navEl.classList.toggle('scrolled', scrollY > 40);
  const sec = document.getElementById('nav-sec');
  if (sec) sec.textContent = '¶ ' + ((under && under.id) || 'hero');
};

const updateParallax = () => {
  updateNavTheme();

  // reveal fallback: IO can miss elements entering under the sticky curtain
  layoutCache.workReveals = layoutCache.workReveals.filter(item => {
    if (item.top - scrollY < layoutCache.windowHeight * 0.85) {
      item.el.classList.add('in');
      return false;
    }
    return true;
  });

  layoutCache.ssImgs.forEach(item => {
    const rectTop = item.top - scrollY;
    item.el.style.setProperty('--parallax', (rectTop / layoutCache.windowHeight).toFixed(4));
  });

  // projects slider: slide images drift against scroll.
  // Live rects: these sit inside the sticky (pinnable) projects section,
  // so cached document coordinates would lie whenever it's pinned.
  psMedias.forEach(el => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--pspar', ((r.top + r.height / 2 - layoutCache.windowHeight / 2) / layoutCache.windowHeight).toFixed(4));
  });

  // work lags 90px behind and settles as it enters
  if (workSec) {
    const top = layoutCache.workSecOffsetTop - scrollY; // layout position, transform-free
    const e = Math.max(0, Math.min(1, (layoutCache.windowHeight - top) / (layoutCache.windowHeight * 0.9)));
    workSec.style.transform = `translateY(${((1 - e) * 90).toFixed(1)}px)`;
  }

  // skills: the two hands slide in from their own edges as the section
  // enters, meeting at the center — and retreat when scrolling back up
  if (skillsSec && skillsCvL) {
    const currentSkillsTop = layoutCache.skillsTop - scrollY;
    const e = Math.max(0, Math.min(1, (layoutCache.windowHeight - currentSkillsTop) / (layoutCache.windowHeight * 0.9)));
    const d = ((1 - e) * (skillsCvL.clientWidth || 400) * 0.7).toFixed(1);
    skillsCvL.style.transform = `translateX(${-d}px)`;
    skillsCvR.style.transform = `translateX(${d}px)`;
    skillsCvL.style.opacity = skillsCvR.style.opacity = (e * 0.5).toFixed(3);

    // the seam ignites as the section arrives; the hands' contact
    // unmasks the inscription
    skillsSec.classList.toggle('lit', e > 0.05);
    if (e > 0.985 && !touchFired) {
      touchFired = true;
      document.getElementById('skills-epigraph')?.classList.add('touched');
    }
  }

  // reading progress under the nav
  navEl.style.setProperty('--sp', (scrollY / Math.max(1, layoutCache.scrollHeight - layoutCache.windowHeight)).toFixed(4));

  // pinned hero drifts up at 0.3x while the next section curtains over it;
  // once well past it, hide it so it can't bleed through section seams
  const heroDrift = -Math.min(scrollY, layoutCache.windowHeight) * 0.3;
  hero.style.transform = `translateY(${heroDrift}px)`;
  hero.style.visibility = scrollY > layoutCache.windowHeight * 1.6 ? 'hidden' : 'visible';

  if (research) {
    const currentResearchTop = layoutCache.researchTop - scrollY;

    // statement lines stick until the white section touches them, then
    // ride its edge upward while fading out (second line slightly faster)
    if (stmtLines.length) {
      const currentStmtBottom = layoutCache.stmtParentBottom - scrollY;
      const push = Math.min(0, currentResearchTop - currentStmtBottom);
      stmtLines.forEach((p, i) => {
        p.style.transform = `translateY(${push * (1 + i * 0.25)}px)`;
        p.style.opacity = Math.max(0, 1 + push / 100);
      });
    }
  }
};

document.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateParallax();
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

// Debounced resize handler to update layoutCache and update parallax.
// A second pass runs after the slower module rebuilds (ascii canvases at
// 200ms) have settled the final layout — zoom in/out fires resize and
// reflows everything, so one early pass isn't enough.
let resizeTimeout, resizeTimeout2;
addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  clearTimeout(resizeTimeout2);
  resizeTimeout = setTimeout(() => {
    layoutCache.cache();
    updateParallax();
  }, 100);
  resizeTimeout2 = setTimeout(() => {
    layoutCache.cache();
    updateParallax();
  }, 500);
});

// Setup event listeners for initial caching and subsequent updates
const setupAndCache = () => {
  layoutCache.cache();
  updateParallax();
};

addEventListener('load', setupAndCache);
if (document.fonts) {
  document.fonts.ready.then(setupAndCache);
}

// Initial cache populate
layoutCache.cache();
updateParallax();
