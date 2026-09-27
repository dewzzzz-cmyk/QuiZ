// AR-компоненты «Звёздной экспедиции»: процедурные текстуры планет, портал в космос под каждой
// планетой, звёзды вокруг, свечение и голограмма с кодом. Все текстуры рисуются в браузере на
// canvas — картинок в проекте нет. Подключается после A-Frame и AR.js.
(() => {
  if (!window.AFRAME) return; // A-Frame не загрузился (нет сети) — квест покажет экран без AR
  const THREE = window.AFRAME.THREE;
  const TAU = Math.PI * 2;

  // Детерминированный генератор: у всех игроков одинаковые планеты.
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  }
  // Пятно, повторённое по краям — чтобы на сфере не было шва.
  function wrapBlob(g, w, x, y, r, paint) {
    for (const dx of [-w, 0, w]) if (x + dx + r > 0 && x + dx - r < w) paint(x + dx, y, r);
  }
  function softBlob(g, x, y, r, color, alpha) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color.replace('A', alpha));
    grad.addColorStop(1, color.replace('A', 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  function grain(g, w, h, rand, amount, alpha) {
    for (let i = 0; i < amount; i++) {
      const v = Math.floor(rand() * 255);
      g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      g.fillRect(rand() * w, rand() * h, 2, 2);
    }
  }

  const TEXTURES = {
    moon: () => canvas(1024, 512, (g, w, h) => {
      const rand = rng(7);
      g.fillStyle = '#a7abb2';
      g.fillRect(0, 0, w, h);
      grain(g, w, h, rand, 60000, 0.05);
      // Моря — тёмные пятна.
      for (let i = 0; i < 14; i++) {
        const x = rand() * w, y = h * (0.25 + rand() * 0.5), r = 40 + rand() * 110;
        wrapBlob(g, w, x, y, r, (px, py, pr) => softBlob(g, px, py, pr, 'rgba(70,74,84,A)', 0.55));
      }
      // Кратеры: тёмная чаша, светлый вал со стороны «солнца», тень с другой.
      for (let i = 0; i < 260; i++) {
        const r = rand() < 0.85 ? 3 + rand() * 12 : 14 + rand() * 30;
        // У полюсов текстура сжимается в точку — туда кратеры не ставим.
        const x = rand() * w, y = h * 0.12 + r + rand() * (h * 0.76 - 2 * r);
        wrapBlob(g, w, x, y, r, (px, py, pr) => {
          const bowl = g.createRadialGradient(px + pr * 0.25, py + pr * 0.25, pr * 0.1, px, py, pr);
          bowl.addColorStop(0, 'rgba(60,62,70,0.75)');
          bowl.addColorStop(0.75, 'rgba(95,98,106,0.5)');
          bowl.addColorStop(1, 'rgba(95,98,106,0)');
          g.fillStyle = bowl;
          g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
          g.lineWidth = Math.max(1, pr * 0.12);
          g.strokeStyle = 'rgba(225,229,236,0.28)';
          g.beginPath(); g.arc(px, py, pr, Math.PI * 0.95, Math.PI * 1.65); g.stroke();
          g.strokeStyle = 'rgba(40,42,48,0.2)';
          g.beginPath(); g.arc(px, py, pr, Math.PI * -0.1, Math.PI * 0.7); g.stroke();
        });
      }
    }),

    mars: () => canvas(1024, 512, (g, w, h) => {
      const rand = rng(11);
      const base = g.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, '#b5532a'); base.addColorStop(0.5, '#d4652f'); base.addColorStop(1, '#a9471f');
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      grain(g, w, h, rand, 50000, 0.06);
      for (let i = 0; i < 40; i++) {
        const x = rand() * w, y = h * (0.2 + rand() * 0.6), r = 20 + rand() * 90;
        const dark = rand() < 0.6;
        wrapBlob(g, w, x, y, r, (px, py, pr) => softBlob(g, px, py, pr, dark ? 'rgba(96,34,14,A)' : 'rgba(236,150,90,A)', dark ? 0.55 : 0.35));
      }
      // Долина Маринер — длинный разлом.
      g.strokeStyle = 'rgba(90,32,12,0.28)';
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(w * 0.3, h * 0.52);
      g.bezierCurveTo(w * 0.4, h * 0.47, w * 0.5, h * 0.56, w * 0.62, h * 0.5); g.stroke();
      // Полярные шапки.
      for (const [y0, y1] of [[0, 46], [h, h - 40]]) {
        const cap = g.createLinearGradient(0, y0, 0, y1);
        cap.addColorStop(0, 'rgba(250,250,255,0.95)'); cap.addColorStop(1, 'rgba(250,250,255,0)');
        g.fillStyle = cap;
        g.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0));
      }
    }),

    saturn: () => canvas(1024, 512, (g, w, h) => {
      const rand = rng(23);
      const bands = ['#e8d3a2', '#d9b77c', '#f0dfb6', '#c99d62', '#e3c58f', '#b98a55', '#ecd8a8', '#d2ad73'];
      let y = 0;
      while (y < h) {
        const bh = 10 + rand() * 40;
        g.fillStyle = bands[Math.floor(rand() * bands.length)];
        g.fillRect(0, y, w, bh + 1);
        y += bh;
      }
      g.filter = 'blur(6px)';
      g.drawImage(g.canvas, 0, 0);
      g.filter = 'none';
      grain(g, w, h, rand, 30000, 0.04);
      const pole = g.createLinearGradient(0, 0, 0, h);
      pole.addColorStop(0, 'rgba(120,110,150,0.45)'); pole.addColorStop(0.15, 'rgba(0,0,0,0)');
      pole.addColorStop(0.85, 'rgba(0,0,0,0)'); pole.addColorStop(1, 'rgba(120,110,150,0.45)');
      g.fillStyle = pole;
      g.fillRect(0, 0, w, h);
    }),

    // Кольца Сатурна: концентрические полосы. У RingGeometry UV плоские, поэтому центр
    // текстуры совпадает с центром кольца, а край — с внешним радиусом.
    saturnRing: () => canvas(1024, 1024, (g, w, h) => {
      const rand = rng(31);
      const cx = w / 2, cy = h / 2, outer = w / 2;
      for (let r = outer; r > outer * 0.5; r -= 2) {
        const t = (r - outer * 0.5) / (outer * 0.5);
        const gap = t > 0.62 && t < 0.68; // щель Кассини
        const a = gap ? 0.05 : 0.35 + rand() * 0.55;
        const c = 190 + Math.floor(rand() * 50);
        g.strokeStyle = `rgba(${c},${c - 25},${c - 70},${a})`;
        g.lineWidth = 2.2;
        g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
      }
    }),

    rock: () => canvas(256, 256, (g, w, h) => {
      const rand = rng(41);
      g.fillStyle = '#6f6254';
      g.fillRect(0, 0, w, h);
      grain(g, w, h, rand, 9000, 0.12);
      for (let i = 0; i < 30; i++) softBlob(g, rand() * w, rand() * h, 6 + rand() * 20, 'rgba(40,34,28,A)', 0.5);
    }),

    // Окно в космос: звёзды и туманность, по краю — мягкое затухание.
    space: () => canvas(1024, 1024, (g, w, h) => {
      const rand = rng(5);
      const bg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      bg.addColorStop(0, '#0d1240'); bg.addColorStop(0.7, '#060a26'); bg.addColorStop(1, '#030514');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      softBlob(g, w * 0.32, h * 0.38, w * 0.3, 'rgba(139,92,246,A)', 0.35);
      softBlob(g, w * 0.68, h * 0.62, w * 0.28, 'rgba(34,211,238,A)', 0.25);
      softBlob(g, w * 0.55, h * 0.3, w * 0.18, 'rgba(236,72,153,A)', 0.18);
      for (let i = 0; i < 900; i++) {
        const r = rand() < 0.95 ? rand() * 1.4 + 0.4 : rand() * 2.5 + 1.5;
        const x = rand() * w, y = rand() * h;
        g.fillStyle = rand() < 0.2 ? 'rgba(165,243,252,0.9)' : 'rgba(255,255,255,0.9)';
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        if (r > 2) softBlob(g, x, y, r * 5, 'rgba(255,255,255,A)', 0.25);
      }
      // Круглое окно с мягким краем.
      g.globalCompositeOperation = 'destination-in';
      const mask = g.createRadialGradient(w / 2, h / 2, w * 0.4, w / 2, h / 2, w / 2);
      mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = mask;
      g.fillRect(0, 0, w, h);
    }),

    glow: () => canvas(256, 256, (g, w, h) => softBlob(g, w / 2, h / 2, w / 2, 'rgba(255,255,255,A)', 1)),
  };

  const cache = {};
  function texture(name) {
    if (!cache[name]) {
      const t = new THREE.CanvasTexture(TEXTURES[name]());
      t.anisotropy = 4;
      cache[name] = t;
    }
    return cache[name];
  }

  // ---------- Планета с текстурой и атмосферой ----------
  AFRAME.registerComponent('planet', {
    schema: {
      type: { default: 'moon' },
      radius: { default: 0.4 },
      atmosphere: { type: 'color', default: '' },
      spin: { default: 30 }, // секунд на оборот
    },
    init() {
      const d = this.data;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(d.radius, 64, 32),
        new THREE.MeshStandardMaterial({ map: texture(d.type), roughness: 1, metalness: 0 }),
      );
      this.mesh = mesh;
      this.el.setObject3D('mesh', mesh);
      if (d.atmosphere) {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: texture('glow'), color: d.atmosphere, transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        glow.scale.setScalar(d.radius * 3.2);
        this.el.setObject3D('glow', glow);
      }
    },
    tick(t, dt) {
      if (this.data.spin) this.mesh.rotation.y += (TAU * dt) / (this.data.spin * 1000);
    },
  });

  // ---------- Кольца Сатурна ----------
  AFRAME.registerComponent('planet-ring', {
    schema: { inner: { default: 0.4 }, outer: { default: 0.75 } },
    init() {
      const mat = new THREE.MeshBasicMaterial({ map: texture('saturnRing'), transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(this.data.inner, this.data.outer, 128, 1), mat);
      mesh.rotation.x = -Math.PI / 2;
      this.el.setObject3D('mesh', mesh);
    },
  });

  // ---------- Портал в космос на месте метки ----------
  AFRAME.registerComponent('space-portal', {
    schema: { radius: { default: 0.8 }, color: { type: 'color', default: '#5ef2ff' } },
    init() {
      const r = this.data.radius;
      const group = new THREE.Group();
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(r, 96),
        new THREE.MeshBasicMaterial({ map: texture('space'), transparent: true, depthWrite: false }),
      );
      disc.rotation.x = -Math.PI / 2;
      group.add(disc);
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.9, r * 0.94, 96),
        new THREE.MeshBasicMaterial({ color: this.data.color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.002;
      group.add(rim);
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.86, r * 1.02, 96),
        new THREE.MeshBasicMaterial({ color: this.data.color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.001;
      group.add(halo);
      this.disc = disc;
      this.rim = rim;
      this.el.setObject3D('mesh', group);
    },
    tick(t) {
      this.disc.rotation.z = t / 40000;
      this.rim.material.opacity = 0.6 + Math.sin(t / 400) * 0.25;
    },
  });

  // ---------- Звёзды вокруг объекта ----------
  AFRAME.registerComponent('star-dust', {
    schema: { count: { default: 160 }, radius: { default: 1.1 }, height: { default: 1.4 }, size: { default: 0.035 } },
    init() {
      const d = this.data;
      const rand = rng(99);
      const pos = new Float32Array(d.count * 3);
      const col = new Float32Array(d.count * 3);
      const palette = [[1, 1, 1], [0.65, 0.95, 1], [0.8, 0.7, 1], [1, 0.85, 0.5]];
      for (let i = 0; i < d.count; i++) {
        const a = rand() * TAU, r = d.radius * Math.sqrt(rand());
        pos.set([Math.cos(a) * r, 0.05 + rand() * d.height, Math.sin(a) * r], i * 3);
        col.set(palette[Math.floor(rand() * palette.length)], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.mat = new THREE.PointsMaterial({
        size: d.size, map: texture('glow'), vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      });
      this.points = new THREE.Points(geo, this.mat);
      this.el.setObject3D('mesh', this.points);
    },
    tick(t) {
      this.mat.opacity = 0.75 + Math.sin(t / 300) * 0.2;
      this.points.rotation.y = t / 30000;
    },
  });

  // ---------- Свечение (спрайт) ----------
  AFRAME.registerComponent('glow', {
    schema: { color: { type: 'color', default: '#ffffff' }, size: { default: 1 }, opacity: { default: 0.8 }, pulse: { default: 0 } },
    init() {
      this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture('glow'), color: this.data.color, transparent: true, opacity: this.data.opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      this.sprite.scale.setScalar(this.data.size);
      this.el.setObject3D('glow', this.sprite);
    },
    tick(t) {
      if (this.data.pulse) this.sprite.material.opacity = this.data.opacity * (0.75 + 0.25 * Math.sin(t / this.data.pulse));
    },
  });

  // ---------- Астероид: неровный камень ----------
  AFRAME.registerComponent('asteroid', {
    schema: { size: { default: 0.1 }, seed: { default: 1 } },
    init() {
      const rand = rng(this.data.seed * 977);
      const geo = new THREE.IcosahedronGeometry(this.data.size, 1);
      const p = geo.attributes.position;
      const byKey = new Map();
      for (let i = 0; i < p.count; i++) {
        const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
        if (!byKey.has(key)) byKey.set(key, 0.7 + rand() * 0.5);
        const k = byKey.get(key);
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture('rock'), roughness: 1, flatShading: true }));
      this.mesh = mesh;
      this.spin = 0.3 + rand();
      this.el.setObject3D('mesh', mesh);
    },
    tick(t, dt) {
      this.mesh.rotation.x += dt * 0.0006 * this.spin;
      this.mesh.rotation.y += dt * 0.0009 * this.spin;
    },
  });

  // ---------- Голограмма с кодом (для Марса) ----------
  AFRAME.registerComponent('hologram', {
    schema: { title: { default: 'КОД ДОСТУПА' }, text: { default: '' }, width: { default: 0.8 } },
    init() {
      this.mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.data.width, this.data.width * 0.56), this.mat);
      this.el.setObject3D('mesh', this.mesh);
      // Шрифт Russo One может догрузиться позже — тогда перерисуем табло.
      document.fonts?.ready.then(() => this.update());
    },
    update() {
      const { title, text } = this.data;
      const c = canvas(1024, 576, (g, w, h) => {
        g.fillStyle = 'rgba(20,90,140,0.35)';
        g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 6) { g.fillStyle = 'rgba(94,242,255,0.07)'; g.fillRect(0, y, w, 2); }
        g.strokeStyle = 'rgba(94,242,255,0.95)';
        g.lineWidth = 8;
        g.strokeRect(12, 12, w - 24, h - 24);
        g.lineWidth = 14;
        for (const [x, y, dx, dy] of [[12, 12, 1, 1], [w - 12, 12, -1, 1], [12, h - 12, 1, -1], [w - 12, h - 12, -1, -1]]) {
          g.beginPath(); g.moveTo(x, y + dy * 70); g.lineTo(x, y); g.lineTo(x + dx * 70, y); g.stroke();
        }
        g.fillStyle = 'rgba(165,243,252,0.95)';
        g.font = '700 64px "Russo One", "Manrope", sans-serif';
        g.textAlign = 'center';
        g.fillText(title, w / 2, 130);
        g.shadowColor = '#5ef2ff';
        g.shadowBlur = 40;
        g.fillStyle = '#e0fdff';
        g.font = '700 250px "Russo One", "Manrope", monospace';
        g.fillText(text.split('').join(' '), w / 2, 430);
      });
      this.mat.map?.dispose();
      this.mat.map = new THREE.CanvasTexture(c);
      this.mat.needsUpdate = true;
    },
    tick(t) {
      this.mat.opacity = 0.85 + Math.sin(t / 90) * 0.05 + (Math.random() < 0.02 ? -0.3 : 0);
    },
  });
})();
