// AR-компоненты «Звёздной экспедиции». Подключается после A-Frame и AR.js.
// Текстуры лежат в space/textures (генерирует tools/space-art): цвет + карта рельефа.
(() => {
  if (!window.AFRAME) return; // A-Frame не загрузился (нет сети) — квест покажет экран без AR
  const THREE = window.AFRAME.THREE;
  const TAU = Math.PI * 2;

  const loader = new THREE.TextureLoader();
  const cache = {};
  function tex(name, color = true) {
    if (!cache[name]) {
      const t = loader.load(`textures/${name}`);
      t.anisotropy = 4;
      if (color) t.encoding = THREE.sRGBEncoding; // сцена с colorManagement
      cache[name] = t;
    }
    return cache[name];
  }

  // Мягкое пятно для звёзд, свечения и пламени.
  let glowTex = null;
  function glow() {
    if (!glowTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      glowTex = new THREE.CanvasTexture(c);
    }
    return glowTex;
  }

  const PLANETS = {
    moon: { map: 'moon.jpg', bump: 'moon-bump.jpg', bumpScale: 0.012, roughness: 1 },
    mars: { map: 'mars.jpg', bump: 'mars-bump.jpg', bumpScale: 0.006, roughness: 0.95 },
    saturn: { map: 'saturn.jpg', roughness: 0.85 },
  };

  // Атмосфера: свечение по краю диска, сильнее на освещённой стороне (френель).
  function atmosphere(radius, color) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(color) } },
      vertexShader: `
        varying vec3 vNormal; varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vView;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vView), 0.0);
          float a = pow(rim, 3.2) * 0.9;
          gl_FragColor = vec4(glowColor * a, a);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 64, 32), mat);
  }

  // ---------- Планета ----------
  AFRAME.registerComponent('planet', {
    schema: {
      type: { default: 'moon' },
      radius: { default: 0.4 },
      atmosphere: { type: 'color', default: '' },
      spin: { default: 30 }, // секунд на оборот; 0 — не крутится
    },
    init() {
      const d = this.data;
      const def = PLANETS[d.type];
      const mat = new THREE.MeshStandardMaterial({ map: tex(def.map), roughness: def.roughness, metalness: 0 });
      if (def.bump) {
        mat.bumpMap = tex(def.bump, false);
        mat.bumpScale = def.bumpScale;
      }
      this.mesh = new THREE.Mesh(new THREE.SphereGeometry(d.radius, 96, 48), mat);
      this.el.setObject3D('mesh', this.mesh);
      if (d.atmosphere) this.el.setObject3D('atmo', atmosphere(d.radius, d.atmosphere));
    },
    tick(t, dt) {
      if (this.data.spin) this.mesh.rotation.y += (TAU * dt) / (this.data.spin * 1000);
    },
  });

  // ---------- Кольца Сатурна (у RingGeometry плоские UV: центр текстуры = центр кольца) ----------
  AFRAME.registerComponent('planet-ring', {
    schema: { inner: { default: 0.4 }, outer: { default: 0.75 } },
    init() {
      const map = tex('saturn-ring.png');
      const mat = new THREE.MeshStandardMaterial({ map, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1, alphaTest: 0.02 });
      // Текстура нарисована от 0.52 до 1 радиуса; растягиваем так, чтобы inner попал на 0.52.
      const outerTex = this.data.inner / 0.52;
      const geo = new THREE.RingGeometry(this.data.inner, this.data.outer, 180, 1);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, pos.getX(i) / (2 * Math.max(outerTex, this.data.outer)) + 0.5, pos.getY(i) / (2 * Math.max(outerTex, this.data.outer)) + 0.5);
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      this.el.setObject3D('mesh', mesh);
    },
  });

  // ---------- Окно в космос на месте метки ----------
  AFRAME.registerComponent('space-portal', {
    schema: { radius: { default: 0.9 } },
    init() {
      const r = this.data.radius;
      const group = new THREE.Group();
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(r, 128),
        new THREE.MeshBasicMaterial({ map: tex('space.png'), transparent: true, depthWrite: false }),
      );
      disc.rotation.x = -Math.PI / 2;
      group.add(disc);
      // Тонкая линия по краю — как у иллюминатора, без неона.
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.905, r * 0.912, 160),
        new THREE.MeshBasicMaterial({ color: 0xe8edf3, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.002;
      group.add(rim);
      this.disc = disc;
      this.el.setObject3D('mesh', group);
    },
    tick(t) {
      this.disc.rotation.z = t / 90000;
    },
  });

  // ---------- Звёздная пыль вокруг станции ----------
  AFRAME.registerComponent('star-dust', {
    schema: { count: { default: 100 }, radius: { default: 1.1 }, height: { default: 1.1 }, size: { default: 0.022 } },
    init() {
      const d = this.data;
      let s = 99;
      const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      const pos = new Float32Array(d.count * 3);
      for (let i = 0; i < d.count; i++) {
        const a = rand() * TAU, r = d.radius * Math.sqrt(rand());
        pos.set([Math.cos(a) * r, 0.05 + rand() * d.height, Math.sin(a) * r], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.mat = new THREE.PointsMaterial({
        size: d.size, map: glow(), color: 0xffffff, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      });
      this.points = new THREE.Points(geo, this.mat);
      this.el.setObject3D('mesh', this.points);
    },
    tick(t) {
      this.mat.opacity = 0.7 + Math.sin(t / 700) * 0.12;
      this.points.rotation.y = t / 60000;
    },
  });

  // ---------- Свечение (спрайт) ----------
  AFRAME.registerComponent('glow', {
    schema: { color: { type: 'color', default: '#ffffff' }, size: { default: 1 }, opacity: { default: 0.8 }, pulse: { default: 0 } },
    init() {
      this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glow(), color: this.data.color, transparent: true, opacity: this.data.opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      this.sprite.scale.setScalar(this.data.size);
      this.el.setObject3D('glow', this.sprite);
    },
    tick(t) {
      if (this.data.pulse) this.sprite.material.opacity = this.data.opacity * (0.8 + 0.2 * Math.sin(t / this.data.pulse));
    },
  });

  // ---------- Астероид: неровный камень с рельефом ----------
  AFRAME.registerComponent('asteroid', {
    schema: { size: { default: 0.1 }, seed: { default: 1 } },
    init() {
      let s = this.data.seed * 977;
      const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      const geo = new THREE.IcosahedronGeometry(this.data.size, 2);
      const p = geo.attributes.position;
      const byKey = new Map();
      for (let i = 0; i < p.count; i++) {
        const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
        if (!byKey.has(key)) byKey.set(key, 0.75 + rand() * 0.4);
        const k = byKey.get(key);
        p.setXYZ(i, p.getX(i) * k * 1.15, p.getY(i) * k * 0.85, p.getZ(i) * k);
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ map: tex('rock.jpg'), bumpMap: tex('rock-bump.jpg', false), bumpScale: 0.01, roughness: 1 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.spin = 0.3 + rand();
      this.el.setObject3D('mesh', this.mesh);
    },
    tick(t, dt) {
      this.mesh.rotation.x += dt * 0.0004 * this.spin;
      this.mesh.rotation.y += dt * 0.0006 * this.spin;
    },
  });

  // ---------- Голограмма с кодом (Марс) — в стиле приборов ЦУПа ----------
  AFRAME.registerComponent('hologram', {
    schema: { title: { default: 'КОД ДОСТУПА' }, text: { default: '' }, width: { default: 0.8 } },
    init() {
      this.mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.data.width, this.data.width * 0.56), this.mat);
      this.el.setObject3D('mesh', this.mesh);
      document.fonts?.ready.then(() => this.update());
    },
    update() {
      const { title, text } = this.data;
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 576;
      const g = c.getContext('2d');
      const amber = 'rgba(245,165,36,';
      g.fillStyle = `${amber}0.10)`;
      g.fillRect(0, 0, 1024, 576);
      for (let y = 0; y < 576; y += 6) { g.fillStyle = `${amber}0.05)`; g.fillRect(0, y, 1024, 2); }
      g.strokeStyle = `${amber}0.55)`;
      g.lineWidth = 3;
      g.strokeRect(16, 16, 992, 544);
      g.lineWidth = 8;
      g.strokeStyle = `${amber}1)`;
      for (const [x, y, dx, dy] of [[16, 16, 1, 1], [1008, 16, -1, 1], [16, 560, 1, -1], [1008, 560, -1, -1]]) {
        g.beginPath(); g.moveTo(x, y + dy * 60); g.lineTo(x, y); g.lineTo(x + dx * 60, y); g.stroke();
      }
      g.fillStyle = `${amber}0.9)`;
      g.font = '500 44px "IBM Plex Mono", monospace';
      g.textAlign = 'left';
      g.fillText(title, 60, 100);
      g.textAlign = 'right';
      g.fillText('MSL-02', 964, 100);
      g.fillRect(60, 124, 904, 2);
      g.shadowColor = 'rgba(255,196,110,0.9)';
      g.shadowBlur = 30;
      g.fillStyle = '#ffe2b0';
      g.textAlign = 'center';
      g.font = '600 240px "IBM Plex Mono", monospace';
      g.fillText(text.split('').join(' '), 512, 410);
      g.shadowBlur = 0;
      g.fillStyle = `${amber}0.7)`;
      g.font = '400 34px "IBM Plex Mono", monospace';
      g.fillText('ПЕРЕДАЧА С МАРСОХОДА', 512, 510);
      this.mat.map?.dispose();
      this.mat.map = new THREE.CanvasTexture(c);
      this.mat.needsUpdate = true;
    },
    tick(t) {
      this.mat.opacity = 0.88 + Math.sin(t / 110) * 0.04 + (Math.random() < 0.015 ? -0.35 : 0);
    },
  });
})();
