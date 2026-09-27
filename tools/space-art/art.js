// Генератор графики «Звёздной экспедиции»: текстуры планет для AR и рендеры планет для интерфейса.
// Всё процедурное: 3D-шум Перлина на сфере (без швов и без «сжатия» у полюсов), кратеры,
// полосы, кольца. Рендер сферы — попиксельно: рельеф, терминатор, потемнение к краю, атмосфера,
// тень планеты на кольцах и колец на планете.
// Запускается в браузере: tools/space-art/export.mjs сохраняет картинки в space/textures и space/art.
window.ART = (() => {
  const TAU = Math.PI * 2;

  // ---------- Случайные числа и шум ----------
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function makeNoise(seed) {
    const rand = rng(seed);
    const p = new Uint8Array(512);
    const perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y, z) => {
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
    function noise(x, y, z) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      return lerp(
        lerp(lerp(grad(p[AA] & 15, x, y, z), grad(p[BA] & 15, x - 1, y, z), u),
          lerp(grad(p[AB] & 15, x, y - 1, z), grad(p[BB] & 15, x - 1, y - 1, z), u), v),
        lerp(lerp(grad(p[AA + 1] & 15, x, y, z - 1), grad(p[BA + 1] & 15, x - 1, y, z - 1), u),
          lerp(grad(p[AB + 1] & 15, x, y - 1, z - 1), grad(p[BB + 1] & 15, x - 1, y - 1, z - 1), u), v),
        w,
      );
    }
    function fbm(x, y, z, oct = 5, lac = 2, gain = 0.5) {
      let sum = 0, amp = 1, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) {
        sum += amp * noise(x * f, y * f, z * f);
        norm += amp;
        amp *= gain;
        f *= lac;
      }
      return sum / norm;
    }
    function ridged(x, y, z, oct = 4) {
      let sum = 0, amp = 0.5, f = 1;
      for (let i = 0; i < oct; i++) {
        const n = 1 - Math.abs(noise(x * f, y * f, z * f));
        sum += n * n * amp;
        amp *= 0.5;
        f *= 2;
      }
      return sum;
    }
    return { noise, fbm, ridged };
  }

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const mix3 = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function ramp(stops, t) {
    t = clamp(t);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
        return mix3(c0, c1, (t - t0) / (t1 - t0 || 1));
      }
    }
    return stops[stops.length - 1][1];
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // Обход равнопромежуточной карты: для каждого текселя — точка на единичной сфере.
  function equirect(w, h, fn) {
    const color = canvas(w, h), height = canvas(w, h);
    const cd = color.getContext('2d').createImageData(w, h);
    const hd = height.getContext('2d').createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const lat = (0.5 - (y + 0.5) / h) * Math.PI;
      const cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < w; x++) {
        const lon = ((x + 0.5) / w) * TAU;
        const px = cl * Math.cos(lon), pz = cl * Math.sin(lon);
        const [r, g, b, hh = 0.5] = fn(px, sl, pz, lat, lon);
        const i = (y * w + x) * 4;
        cd.data[i] = r; cd.data[i + 1] = g; cd.data[i + 2] = b; cd.data[i + 3] = 255;
        const hv = clamp(hh) * 255;
        hd.data[i] = hd.data[i + 1] = hd.data[i + 2] = hv; hd.data[i + 3] = 255;
      }
    }
    color.getContext('2d').putImageData(cd, 0, 0);
    height.getContext('2d').putImageData(hd, 0, 0);
    return { color, height };
  }

  // Кратеры, разбросанные по сфере. Возвращает функцию: точка → { h, bright }.
  function craterField(seed, bins) {
    const rand = rng(seed);
    const list = [];
    for (const [count, rMin, rMax] of bins) {
      for (let i = 0; i < count; i++) {
        const z = rand() * 2 - 1, phi = rand() * TAU, s = Math.sqrt(1 - z * z);
        const r = rMin * Math.pow(rMax / rMin, Math.pow(rand(), 1.8));
        list.push({ x: s * Math.cos(phi), y: z, z: s * Math.sin(phi), r, cos: Math.cos(r * 3), age: rand() });
      }
    }
    return (px, py, pz) => {
      let h = 0, bright = 0;
      for (const c of list) {
        const d = px * c.x + py * c.y + pz * c.z;
        if (d < c.cos) continue;
        const ang = Math.acos(Math.min(1, d)) / c.r;
        if (ang < 1) h += (ang * ang - 1) * c.r * 5.5 * (0.6 + c.age * 0.4);
        h += Math.exp(-(((ang - 1) / 0.22) ** 2)) * c.r * 2.2;
        if (c.age > 0.75 && ang < 2.6) bright += Math.max(0, 1 - ang / 2.6) * (c.age - 0.75) * 2.2;
      }
      return { h, bright };
    };
  }

  // ---------- Текстуры ----------
  function moon(w = 1024, h = 512) {
    const N = makeNoise(3);
    const craters = craterField(17, [[700, 0.006, 0.02], [90, 0.02, 0.06], [12, 0.06, 0.13]]);
    return equirect(w, h, (x, y, z) => {
      const detail = N.fbm(x * 6, y * 6, z * 6, 6);
      const maria = smooth(0.02, 0.2, N.fbm(x * 1.3 + 7, y * 1.3, z * 1.3, 4));
      const c = craters(x, y, z);
      let v = 0.66 + detail * 0.22 - maria * 0.24 + c.bright * 0.25 + c.h * 0.6;
      v = clamp(v, 0.1, 0.98);
      const tint = mix3([v * 255, v * 250, v * 243], [v * 235, v * 236, v * 240], maria);
      return [...tint, 0.5 + detail * 0.25 - maria * 0.08 + c.h * 3];
    });
  }

  function mars(w = 1024, h = 512) {
    const N = makeNoise(5);
    const hi = w >= 2048; // большая текстура — больше мелких деталей
    const craters = craterField(29, hi ? [[1400, 0.0015, 0.006], [160, 0.006, 0.02], [20, 0.02, 0.05]] : [[160, 0.006, 0.02], [20, 0.02, 0.05]]);
    const stops = [[0, hex('#2e1a12')], [0.25, hex('#5c2c1a')], [0.45, hex('#94421f')], [0.62, hex('#b9582c')], [0.8, hex('#cf7c4a')], [1, hex('#dea279')]];
    return equirect(w, h, (x, y, z, lat) => {
      const albedo = N.fbm(x * 1.4 + 3, y * 1.4, z * 1.4, 6);
      const detail = N.fbm(x * 6, y * 6, z * 6, hi ? 9 : 6);
      const grit = hi ? N.fbm(x * 60, y * 60, z * 60, 3) * 2 : N.noise(x * 40, y * 40, z * 40);
      const c = craters(x, y, z);
      // Тёмные «моря» (как Большой Сырт) с чёткой границей
      const dark = smooth(-0.02, -0.16, albedo);
      let t = 0.66 + albedo * 0.7 + detail * 0.3 + grit * 0.04 + c.h * 1.5 - dark * 0.32;
      // Долина Маринер: разлом у экватора
      const canyon = smooth(0.82, 0.95, N.ridged(x * 3 + 11, y * 9, z * 3, 3)) * smooth(0.35, 0.05, Math.abs(lat + 0.12));
      t -= canyon * 0.35;
      let col = ramp(stops, t);
      // Полярные шапки с рваным краем
      const capN = smooth(1.36, 1.42, lat + N.fbm(x * 5, y * 5, z * 5, 4) * 0.12);
      const capS = smooth(1.42, 1.48, -lat + N.fbm(x * 5 + 5, y * 5, z * 5, 4) * 0.12);
      col = mix3(col, [245, 240, 238], Math.max(capN, capS));
      return [...col, 0.5 + detail * 0.3 + c.h * 2.5 - canyon * 0.25];
    });
  }

  function saturn(w = 1024, h = 512) {
    const N = makeNoise(9);
    const stops = [[0, hex('#b99466')], [0.2, hex('#d8bd8c')], [0.35, hex('#eee0bd')], [0.5, hex('#cfa86f')], [0.65, hex('#e6cf9f')], [0.8, hex('#a87e4f')], [1, hex('#e9d9b2')]];
    return equirect(w, h, (x, y, z, lat) => {
      const turb = N.fbm(x * 3, y * 18, z * 3, 5) * 0.06;
      const t = (Math.sin((lat + turb) * 11) * 0.5 + 0.5) * 0.7 + N.noise(0, (lat + turb) * 24, 0.5) * 0.3 + 0.15;
      let col = ramp(stops, t);
      const streak = N.fbm(x * 22, y * 70, z * 22, 3) * 18;
      col = col.map((v) => v + streak);
      const pole = smooth(1.0, 1.45, Math.abs(lat));
      col = mix3(col, [150, 158, 166], pole * 0.55);
      return [...col, 0.5];
    });
  }

  // Кольца: концентрические полосы, центр текстуры = центр кольца (у RingGeometry плоские UV).
  function saturnRing(size = 1024, inner = 0.52) {
    const N = makeNoise(13);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const profile = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const r = inner + (1 - inner) * (i / 1023);
      let d = 0.62 + N.fbm(r * 22, 0.3, 0.7, 4) * 0.55 + N.noise(r * 260, 0.1, 0.2) * 0.1;
      if (r < 0.64) d *= 0.35; // тусклое кольцо C
      if (r > 0.765 && r < 0.8) d *= 0.06; // щель Кассини
      if (r > 0.94 && r < 0.95) d *= 0.15; // щель Энке
      d *= smooth(inner, inner + 0.02, r) * smooth(1, 0.985, r);
      profile[i] = clamp(d);
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const i4 = (y * size + x) * 4;
      if (r < inner || r > 1) { img.data[i4 + 3] = 0; continue; }
      const d = profile[Math.round(((r - inner) / (1 - inner)) * 1023)];
      const col = mix3(hex('#8f8373'), hex('#e8d6b4'), clamp(d * 1.2));
      img.data[i4] = col[0]; img.data[i4 + 1] = col[1]; img.data[i4 + 2] = col[2];
      img.data[i4 + 3] = d * 235;
    }
    g.putImageData(img, 0, 0);
    return { color: c, profile, inner };
  }

  function rock(w = 512, h = 256) {
    const N = makeNoise(21);
    const craters = craterField(41, [[60, 0.02, 0.08]]);
    return equirect(w, h, (x, y, z) => {
      const d = N.fbm(x * 4, y * 4, z * 4, 6);
      const c = craters(x, y, z);
      const v = clamp(0.42 + d * 0.3 + c.h * 0.5, 0.1, 0.8);
      return [v * 230, v * 212, v * 190, 0.5 + d * 0.4 + c.h * 2];
    });
  }

  // Окно в космос на метке: глубокий фон, неяркая туманность, звёзды разной яркости.
  function space(size = 1024) {
    const N = makeNoise(31);
    const rand = rng(77);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n1 = N.fbm(u * 3, v * 3, 0.5, 6), n2 = N.fbm(u * 5 + 9, v * 5, 1.5, 5);
      const neb = smooth(-0.05, 0.45, n1);
      const r = 4 + neb * 38 * (0.6 + n2) + n2 * 8;
      const gg = 6 + neb * 18 + smooth(0, 0.4, n2) * 22;
      const b = 16 + neb * 52 + smooth(0, 0.4, n2) * 30;
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      const i4 = (y * size + x) * 4;
      img.data[i4] = r; img.data[i4 + 1] = gg; img.data[i4 + 2] = b;
      img.data[i4 + 3] = 255 * smooth(1, 0.78, d);
    }
    g.putImageData(img, 0, 0);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2200; i++) {
      const m = Math.pow(rand(), 7);
      const x = rand() * size, y = rand() * size, r = 0.45 + m * 1.5;
      const warm = rand();
      const col = warm < 0.15 ? '255,214,170' : warm < 0.3 ? '190,215,255' : '255,255,255';
      g.fillStyle = `rgba(${col},${0.35 + m * 0.65})`;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (m > 0.55) {
        const glow = g.createRadialGradient(x, y, 0, x, y, r * 4);
        glow.addColorStop(0, `rgba(${col},${m * 0.22})`); glow.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = glow;
        g.beginPath(); g.arc(x, y, r * 4, 0, TAU); g.fill();
      }
    }
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(size / 2, size / 2, size * 0.39, size / 2, size / 2, size / 2);
    mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = mask;
    g.fillRect(0, 0, size, size);
    return { color: c };
  }

  // ---------- Рендер сферы ----------
  function sampler(cnv) {
    const { width: w, height: h } = cnv;
    const d = cnv.getContext('2d').getImageData(0, 0, w, h).data;
    return (u, v, ch = 0) => {
      u = ((u % 1) + 1) % 1; v = clamp(v, 0, 0.9999);
      const x = u * w - 0.5, y = v * h - 0.5;
      const x0 = Math.floor(x), y0 = Math.max(0, Math.floor(y)), fx = x - x0, fy = y - y0;
      const xa = (x0 + w) % w, xb = (x0 + 1) % w, y1 = Math.min(h - 1, y0 + 1);
      const at = (xx, yy) => d[(yy * w + xx) * 4 + ch];
      return mix(mix(at(xa, y0), at(xb, y0), fx), mix(at(xa, y1), at(xb, y1), fx), fy);
    };
  }
  const norm = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function rotX(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }
  function rotZ(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; }

  /**
   * Рендер планеты в canvas (с прозрачностью).
   * opts: tex {color,height?}, W,H — размер холста, cx,cy,R — центр и радиус в пикселях,
   * sun — направление на солнце (x вправо, y вверх, z к зрителю), tilt — наклон оси (рад),
   * lon — поворот вокруг оси, bump — сила рельефа, atmo [r,g,b], atmoStrength, limb — потемнение к краю,
   * ring {tex, inner, outer (в радиусах планеты), tilt (наклон плоскости к зрителю, рад)}, bg — фон (canvas) под планетой.
   */
  function renderPlanet(opts) {
    const { W, H, cx = W / 2, cy = H / 2, R, tex, tilt = 0, lon = 0, bump = 0, atmo = null, atmoStrength = 0, limb = 0.25, ring = null, ambient = 0.015 } = opts;
    const sun = norm(opts.sun || [-0.7, 0.35, 0.6]);
    const col = sampler(tex.color);
    const cg = (u, v) => [col(u, v, 0), col(u, v, 1), col(u, v, 2)];
    const hgt = tex.height ? sampler(tex.height) : null;
    const out = canvas(W, H);
    const g = out.getContext('2d');
    if (opts.bg) g.drawImage(opts.bg, 0, 0, W, H);
    const img = g.getImageData(0, 0, W, H);
    const D = img.data;
    // Плоскость колец: экватор планеты, повёрнутый на ring.tilt к зрителю и на tilt по оси Z.
    let ringN = null, ringProfile = null;
    if (ring) {
      ringN = norm(rotZ(rotX([0, 1, 0], ring.tilt), tilt));
      ringProfile = ring.tex.profile;
    }
    const ringAt = (q) => {
      const r = Math.hypot(...q);
      if (r < ring.inner || r > ring.outer) return 0;
      const t = (r - ring.inner) / (ring.outer - ring.inner);
      return ringProfile[Math.round(t * 1023)];
    };
    const inShadow = (q) => {
      const t = dot(q, sun);
      if (t > 0) return false;
      const d2 = dot(q, q) - t * t;
      return d2 < 1;
    };
    const blend = (i, c, a) => {
      const ia = D[i + 3] / 255, oa = a + ia * (1 - a);
      for (let k = 0; k < 3; k++) D[i + k] = oa > 0 ? (c[k] * a + D[i + k] * ia * (1 - a)) / oa : 0;
      D[i + 3] = oa * 255;
    };
    const ringColor = (q, d) => {
      const lit = inShadow(q) ? 0.08 : 0.95;
      const base = mix3(hex('#8f8373'), hex('#eadcc0'), clamp(d * 1.2));
      return [base[0] * lit, base[1] * lit, base[2] * lit];
    };
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const x = (px + 0.5 - cx) / R, y = (cy - py - 0.5) / R;
      const rr = x * x + y * y;
      const i = (py * W + px) * 4;
      let ringFront = null, ringZ = -Infinity;
      if (ring) {
        const z = -(x * ringN[0] + y * ringN[1]) / ringN[2];
        const q = [x, y, z];
        const d = ringAt(q);
        if (d > 0.01) { ringFront = { q, d }; ringZ = z; }
      }
      const drawRingBehind = ringFront && (rr > 1 || ringZ < Math.sqrt(Math.max(0, 1 - rr)));
      if (rr > 1) {
        // Атмосфера за краем диска
        if (atmo && rr < 1.35 * 1.35) {
          const r = Math.sqrt(rr);
          const edge = [x / r, y / r, 0];
          const lit = smooth(-0.35, 0.4, dot(edge, sun));
          const a = Math.pow(1 - (r - 1) / 0.35, 3) * atmoStrength * lit;
          if (a > 0.003) blend(i, atmo, clamp(a));
        }
        if (drawRingBehind) blend(i, ringColor(ringFront.q, ringFront.d), ringFront.d * 0.92);
        continue;
      }
      const z = Math.sqrt(1 - rr);
      const n = [x, y, z];
      // Координаты на планете: снимаем наклон оси
      const p = rotZ(n, -tilt);
      const la = Math.asin(clamp(p[1], -1, 1));
      const lo = Math.atan2(p[2], p[0]) + lon;
      const u = lo / TAU, v = 0.5 - la / Math.PI;
      let c = cg(u, v);
      let nn = n;
      if (hgt && bump) {
        const du = 1 / tex.height.width, dv = 1 / tex.height.height;
        const h0 = hgt(u, v);
        const gu = (hgt(u + du, v) - h0) / 255, gv = (hgt(u, v + dv) - h0) / 255;
        const east = norm(rotZ([-Math.sin(lo - lon), 0, Math.cos(lo - lon)], tilt));
        const north = norm([east[1] * n[2] - east[2] * n[1], east[2] * n[0] - east[0] * n[2], east[0] * n[1] - east[1] * n[0]]); // east × n
        nn = norm([n[0] - bump * (gu * east[0] - gv * north[0]), n[1] - bump * (gu * east[1] - gv * north[1]), n[2] - bump * (gu * east[2] - gv * north[2])]);
      }
      const geo = dot(n, sun);
      let light = Math.max(0, dot(nn, sun)) * smooth(-0.08, 0.12, geo);
      // Тень колец на планете
      if (ring) {
        const t = -dot(n, ringN) / dot(sun, ringN);
        if (t > 0) {
          const q = [n[0] + sun[0] * t, n[1] + sun[1] * t, n[2] + sun[2] * t];
          light *= 1 - ringAt(q) * 0.75;
        }
      }
      const lim = 1 - limb + limb * Math.pow(z, 0.6);
      let shade = (ambient + light * 1.08) * lim;
      c = c.map((ch) => ch * shade);
      if (atmo) {
        const rim = Math.pow(1 - z, 2.4) * atmoStrength * 1.6 * smooth(-0.3, 0.5, geo);
        c = c.map((ch, k) => ch + atmo[k] * rim);
      }
      D[i] = clamp(c[0], 0, 255); D[i + 1] = clamp(c[1], 0, 255); D[i + 2] = clamp(c[2], 0, 255);
      // Сглаживание края диска
      const edgeA = clamp((1 - Math.sqrt(rr)) * R * 1.2);
      const bgA = D[i + 3] / 255;
      D[i + 3] = 255 * (edgeA + bgA * (1 - edgeA));
      if (ringFront && ringZ >= z) blend(i, ringColor(ringFront.q, ringFront.d), ringFront.d * 0.92);
    }
    g.putImageData(img, 0, 0);
    return out;
  }

  // Неровный камень: сфера с шумным контуром.
  function renderAsteroid(size, tex, seed = 1) {
    const N = makeNoise(seed * 7 + 1);
    const R = size * 0.36;
    const shape = canvas(size, size);
    const planet = renderPlanet({ W: size, H: size, R, tex, bump: 6, sun: [-0.8, 0.5, 0.5], limb: 0.1, lon: seed });
    const g = shape.getContext('2d');
    g.beginPath();
    for (let a = 0; a <= 360; a += 3) {
      const t = (a / 180) * Math.PI;
      const k = 1 + N.fbm(Math.cos(t) * 1.4, Math.sin(t) * 1.4, 0.3, 4) * 0.45;
      const x = size / 2 + Math.cos(t) * R * 1.1 * k, y = size / 2 + Math.sin(t) * R * 0.85 * k;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    g.save();
    g.clip();
    g.drawImage(planet, -R * 0.18, -R * 0.1, size + R * 0.36, size + R * 0.2);
    g.restore();
    return shape;
  }

  function starfield(W, H, seed = 5, count = 1400) {
    const rand = rng(seed);
    const c = canvas(W, H);
    const g = c.getContext('2d');
    g.fillStyle = '#020308';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < count; i++) {
      const m = Math.pow(rand(), 7);
      g.fillStyle = `rgba(255,255,255,${0.2 + m * 0.8})`;
      g.beginPath(); g.arc(rand() * W, rand() * H, 0.4 + m * 1.6, 0, TAU); g.fill();
    }
    return c;
  }

  // ---------- Сборка всех картинок ----------
  function build() {
    const t = {};
    t.moon = moon(); t.mars = mars(); t.saturn = saturn(); t.ring = saturnRing(); t.rock = rock(); t.space = space();
    const tilt = -0.42;
    const sprites = {
      'planet-moon': renderPlanet({ W: 256, H: 256, R: 110, tex: t.moon, bump: 9, sun: [-0.75, 0.3, 0.55], limb: 0.08 }),
      'planet-mars': renderPlanet({ W: 256, H: 256, R: 100, tex: t.mars, bump: 5, sun: [-0.7, 0.35, 0.6], atmo: [255, 150, 110], atmoStrength: 0.35, lon: 1.2 }),
      'planet-saturn': renderPlanet({ W: 256, H: 256, R: 62, tex: t.saturn, sun: [-0.6, 0.45, 0.66], tilt, limb: 0.35, atmo: [255, 225, 170], atmoStrength: 0.12, ring: { tex: t.ring, inner: 1.25, outer: 2.3, tilt: 0.42 } }),
      'planet-belt': renderAsteroid(256, t.rock, 3),
      'planet-mars-patch': renderPlanet({ W: 512, H: 512, R: 230, tex: t.mars, bump: 5, sun: [-0.55, 0.55, 0.6], atmo: [255, 150, 110], atmoStrength: 0.3, lon: 2.4 }),
    };
    // Заставка: край Марса в нижней части кадра на фоне звёзд
    // Для заставки планета огромная — нужна текстура подробнее, чем для AR.
    const heroTex = mars(4096, 2048);
    const hero = renderPlanet({
      W: 1920, H: 1080, cx: 1500, cy: 1640, R: 1100, tex: heroTex, bump: 5, lon: 3.6, tilt: 0.3,
      sun: [-0.85, 0.42, 0.18], atmo: [255, 150, 110], atmoStrength: 0.5, limb: 0.15, bg: starfield(1920, 1080),
    });
    return { textures: t, sprites, hero };
  }

  return { build, renderPlanet, moon, mars, saturn, saturnRing, rock, space };
})();
