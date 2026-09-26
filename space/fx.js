// Эффекты: звёздное небо, синтезированные звуки, голос бортового компьютера, салют из звёзд.
// Всё генерируется в браузере — никаких аудио- и видеофайлов.
window.FX = (() => {
  // ---------- Звёздное небо (canvas) ----------
  function starfield(canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, stars, speed = 0.4, target = 0.4, raf = null;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((w * h) / 2500) }, spawn);
    }
    function spawn() {
      return { x: (Math.random() - 0.5) * w * 2, y: (Math.random() - 0.5) * h * 2, z: Math.random() * w, hue: Math.random() < 0.2 ? 190 : Math.random() < 0.3 ? 265 : 0 };
    }
    function frame() {
      speed += (target - speed) * 0.04;
      ctx.fillStyle = 'rgba(5, 8, 22, 0.35)';
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        const pz = s.z;
        s.z -= speed * 4;
        if (s.z < 1) Object.assign(s, spawn(), { z: w });
        const k = 160 / s.z, pk = 160 / pz;
        const x = w / 2 + s.x * k, y = h / 2 + s.y * k;
        const px = w / 2 + s.x * pk, py = h / 2 + s.y * pk;
        const a = Math.min(1, 1.2 - s.z / w);
        ctx.strokeStyle = s.hue ? `hsla(${s.hue}, 100%, 75%, ${a})` : `rgba(255,255,255,${a})`;
        ctx.lineWidth = Math.max(0.5, 2.2 - s.z / (w / 2));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x + 0.1, y + 0.1);
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener('resize', resize);
    resize();
    return {
      start() { if (!raf) frame(); },
      stop() { cancelAnimationFrame(raf); raf = null; },
      warp(on) { target = on ? 14 : 0.4; },
    };
  }

  // ---------- Звуки (Web Audio) ----------
  let audio = null;
  let muted = false;
  try { muted = localStorage.getItem('questar-muted') === '1'; } catch {}

  function unlock() {
    if (!audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    audio?.resume?.();
  }
  function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0 } = {}) {
    if (!audio || muted) return;
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.25) {
    if (!audio || muted) return;
    const buf = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(filter).connect(gain).connect(audio.destination);
    src.start();
  }
  const sound = {
    tap: () => tone(880, 0.06, { type: 'triangle', vol: 0.08 }),
    scan: () => tone(520, 0.12, { type: 'sine', vol: 0.06 }),
    found: () => { tone(660, 0.12); tone(990, 0.2, { delay: 0.1 }); },
    success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { delay: i * 0.09, type: 'triangle' })),
    wrong: () => tone(220, 0.3, { type: 'sawtooth', vol: 0.08, slide: 0.6 }),
    collect: () => tone(1200 + Math.random() * 400, 0.12, { type: 'sine', vol: 0.1, slide: 1.5 }),
    beep: () => tone(1000, 0.15, { type: 'square', vol: 0.06 }),
    launch: () => { noise(3.2, 0.35); tone(80, 3, { type: 'sawtooth', vol: 0.12, slide: 3 }); },
  };

  // ---------- Голос бортового компьютера ----------
  let voice = null;
  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    voice = voices.find((v) => v.lang?.toLowerCase().startsWith('ru')) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
  function say(text) {
    if (muted || !('speechSynthesis' in window) || !voice) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 1.02;
    u.pitch = 0.9;
    window.speechSynthesis.speak(u);
  }

  function setMuted(value) {
    muted = value;
    try { localStorage.setItem('questar-muted', value ? '1' : '0'); } catch {}
    if (value) window.speechSynthesis?.cancel();
  }

  // ---------- Салют из звёзд ----------
  function burst(x, y, count = 14, symbols = ['✦', '★', '✧', '·']) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'spark';
      el.textContent = symbols[i % symbols.length];
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 60 + Math.random() * 90;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      el.style.color = ['#5ef2ff', '#ffd166', '#a78bfa', '#ffffff'][i % 4];
      document.body.append(el);
      setTimeout(() => el.remove(), 900);
    }
  }

  return { starfield, unlock, sound, say, burst, setMuted, isMuted: () => muted };
})();
