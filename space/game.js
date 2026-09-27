(() => {
  const Q = window.SPACE_QUEST;
  const { sound, say, burst } = window.FX;
  const icon = (name, cls) => window.ICONS.svg(name, cls);
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const SCAN_MS = 1400; // сколько держать метку в кадре, чтобы «отсканировать»
  const $ = (id) => document.getElementById(id);
  const stations = Q.stations;
  const crystalStations = stations.filter((s) => s.letter);

  const state = {
    name: '',
    current: 0,
    phase: 'start', // start → brief → search → scan → task → reward → … → launch → done
    letters: [],
    startedAt: 0,
    camera: false, // видео с камеры уже идёт
  };
  const visible = new Set(); // метки, которые сейчас в кадре

  const fill = (text) => text.replaceAll('{name}', state.name);
  const stars = window.FX.starfield($('stars'));
  stars.start();

  // ---------- Экраны ----------
  function showScreen(id) {
    const any = Boolean(id);
    $('screens').hidden = !any;
    for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
    $('hud').hidden = any;
    any ? stars.start() : stars.stop();
  }

  let toastTimer;
  function toast(text, ms = 3200) {
    $('toast').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($('toast').hidden = true), ms);
  }

  // ---------- HUD ----------
  function renderHud() {
    const route = $('route');
    route.replaceChildren(
      ...stations.map((s, i) => {
        const li = document.createElement('li');
        li.innerHTML = icon(s.id);
        li.title = s.name;
        li.className = i < state.current ? 'done' : i === state.current ? 'active' : '';
        return li;
      }),
    );
    $('crystals').replaceChildren(
      ...crystalStations.map((_, i) => {
        const slot = document.createElement('span');
        slot.className = 'crystal-slot' + (state.letters[i] ? ' filled' : '');
        slot.textContent = state.letters[i] || '';
        return slot;
      }),
    );
    const st = stations[state.current];
    const searching = state.phase === 'search' || state.phase === 'scan';
    $('objective').hidden = !searching;
    $('objective-icon').innerHTML = st ? icon(st.id) : '';
    $('objective-text').textContent = st?.search ?? '';
    $('reticle').hidden = !searching;
    $('reticle').classList.toggle('scanning', state.phase === 'scan');
    $('reticle-label').textContent = state.phase === 'scan' ? 'Сканирую…' : 'Ищу сигнал…';
    $('demo-btn').hidden = !(DEMO && state.phase === 'search');
    $('sound-btn').innerHTML = icon(window.FX.isMuted() ? 'soundOff' : 'soundOn');
    $('cam-badge').classList.toggle('live', state.camera);
    $('cam-label').textContent = state.camera ? 'КАМЕРА' : DEMO ? 'ДЕМО' : 'НЕТ КАМЕРЫ';

    stations.forEach((s, i) => {
      const obj = $(`obj-${s.id}`);
      const shown = i < state.current || (i === state.current && !searching);
      if (obj && obj.getAttribute('visible') !== String(shown)) obj.setAttribute('visible', shown);
    });
  }

  function materialize(station) {
    const obj = $(`obj-${station.id}`);
    if (!obj) return;
    obj.setAttribute('visible', true);
    obj.setAttribute('animation__pop', { property: 'scale', from: '0.01 0.01 0.01', to: '1 1 1', dur: 900, easing: 'easeOutElastic' });
  }

  // ---------- Поиск и сканирование ----------
  let scanTimer = null;
  let scanTick = null;

  function onMarkerFound(index) {
    visible.add(index);
    if (state.phase === 'search') {
      if (index === state.current) return startScan();
      const s = stations[index];
      if (index < state.current) toast(`Станция «${s.name}» уже пройдена ✓`);
      else toast(`Это сигнал станции «${s.name}». Сначала — ${stations[state.current].name}!`);
    }
  }

  function onMarkerLost(index) {
    visible.delete(index);
    if (state.phase === 'scan' && index === state.current) {
      cancelScan();
      toast('Сигнал потерян — держи планшет ровнее');
    }
  }

  // Метка могла попасть в кадр раньше, чем началась её станция: AR.js второй раз «найдена» не скажет.
  function enterSearch() {
    state.phase = 'search';
    renderHud();
    if (visible.has(state.current)) startScan();
  }

  function startScan() {
    state.phase = 'scan';
    renderHud();
    const ring = $('scan-ring');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = '100';
    ring.getBoundingClientRect();
    ring.style.transition = `stroke-dashoffset ${SCAN_MS}ms linear`;
    ring.style.strokeDashoffset = '0';
    sound.scan();
    scanTick = setInterval(sound.scan, 350);
    scanTimer = setTimeout(finishScan, SCAN_MS);
  }

  function cancelScan() {
    clearTimeout(scanTimer);
    clearInterval(scanTick);
    state.phase = 'search';
    $('scan-ring').style.transition = 'none';
    $('scan-ring').style.strokeDashoffset = '100';
    renderHud();
  }

  function finishScan() {
    clearInterval(scanTick);
    const st = stations[state.current];
    sound.found();
    state.phase = 'task';
    renderHud();
    materialize(st);
    openTask(st);
  }

  // ---------- Задания ----------
  function openPanel(station) {
    $('panel-kicker').innerHTML = `${icon(station.id)}<span>Станция ${stations.indexOf(station) + 1} · ${station.name}</span>`;
    $('panel-title').textContent = station.task.title;
    $('panel-text').textContent = station.task.text;
    $('panel').hidden = false;
    $('panel').classList.remove('enter');
    $('panel').getBoundingClientRect();
    $('panel').classList.add('enter');
    say(station.task.text);
  }

  function closePanel() {
    $('panel').hidden = true;
    $('panel-body').replaceChildren();
  }

  const shake = (el) => {
    el.classList.remove('shake');
    el.getBoundingClientRect();
    el.classList.add('shake');
  };

  const button = (text, cls = 'option') => Object.assign(document.createElement('button'), { className: cls, textContent: text });

  function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    // Не отдаём уже правильный порядок — иначе задание решается само.
    return a.length > 1 && a.every((v, i) => v === list[i]) ? shuffle(list) : a;
  }

  const TASKS = {
    // Вопрос с вариантами ответа.
    choice(task, done) {
      const box = document.createElement('div');
      box.className = 'options';
      task.options.forEach((text, i) => {
        const b = button(text);
        b.addEventListener('click', () => {
          if (i === task.answer) {
            b.classList.add('correct');
            done();
          } else {
            sound.wrong();
            b.classList.add('wrong');
            b.disabled = true;
            toast('Почти! Попробуй другой вариант');
          }
        });
        box.append(b);
      });
      return box;
    },

    // Код, который видно только в AR на табло рядом с планетой.
    code(task, done) {
      const wrap = document.createElement('div');
      wrap.className = 'code';
      const display = document.createElement('div');
      display.className = 'code-display';
      const slots = [...task.code].map(() => display.appendChild(Object.assign(document.createElement('span'), { className: 'code-slot' })));
      const pad = document.createElement('div');
      pad.className = 'keypad';
      let value = '';
      let misses = 0;
      const render = () => slots.forEach((s, i) => { s.textContent = value[i] ?? ''; s.classList.toggle('filled', i < value.length); });
      const press = (key) => {
        sound.tap();
        if (key === '⌫') value = value.slice(0, -1);
        else if (value.length < task.code.length) value += key;
        render();
        if (value.length === task.code.length) {
          if (value === task.code) {
            display.classList.add('ok');
            done();
          } else {
            misses++;
            sound.wrong();
            shake(display);
            setTimeout(() => { value = ''; render(); }, 350);
            toast(misses >= 2 ? 'Подсказка: табло светится справа от Марса — наведи планшет на метку' : 'Код не подошёл. Посмотри на табло ещё раз');
          }
        }
      };
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].forEach((k) => {
        const b = button(k, 'key');
        if (!k) b.style.visibility = 'hidden';
        b.addEventListener('click', () => press(k));
        pad.append(b);
      });
      wrap.append(display, pad);
      if (DEMO) setTimeout(() => toast(`Демо: на табло в AR код ${task.code}`, 5000), 400);
      return wrap;
    },

    // Нажать элементы в правильном порядке.
    order(task, done) {
      const box = document.createElement('div');
      box.className = 'order';
      let next = 0;
      const buttons = shuffle(task.items).map((item) => {
        const b = button(item, 'option chip');
        b.addEventListener('click', () => {
          if (b.dataset.n) return;
          if (item === task.items[next]) {
            sound.tap();
            b.dataset.n = ++next;
            b.classList.add('picked');
            if (next === task.items.length) done();
          } else {
            sound.wrong();
            shake(box);
            toast(`Не туда! Начнём курс заново`);
            next = 0;
            buttons.forEach((x) => { delete x.dataset.n; x.classList.remove('picked'); });
          }
        });
        return b;
      });
      box.append(...buttons);
      return box;
    },

    // Мини-игра: ловить кристаллы поверх камеры.
    catch(task, done) {
      const box = document.createElement('div');
      box.className = 'catch';
      const bar = Object.assign(document.createElement('div'), { className: 'progress' });
      const fillEl = bar.appendChild(Object.assign(document.createElement('span'), {}));
      const label = Object.assign(document.createElement('p'), { className: 'catch-count', textContent: `0 / ${task.goal}` });
      const go = button('Поехали!', 'btn');
      box.append(label, bar, go);

      go.addEventListener('click', () => {
        go.remove();
        $('panel').classList.add('compact');
        const layer = $('catch-layer');
        layer.hidden = false;
        let caught = 0;
        const spawn = () => {
          const c = document.createElement('button');
          c.className = 'falling-crystal';
          c.setAttribute('aria-label', 'Кристалл');
          // Верхняя часть экрана: снизу лежит панель задания.
          c.style.left = `${8 + Math.random() * 84}%`;
          c.style.top = `${16 + Math.random() * 40}%`;
          c.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (c.classList.contains('got')) return;
            c.classList.add('got');
            caught++;
            sound.collect();
            burst(e.clientX, e.clientY, 8);
            label.textContent = `${caught} / ${task.goal}`;
            fillEl.style.width = `${(caught / task.goal) * 100}%`;
            setTimeout(() => c.remove(), 250);
            if (caught >= task.goal) {
              clearInterval(timer);
              layer.replaceChildren();
              layer.hidden = true;
              $('panel').classList.remove('compact');
              done();
            }
          });
          layer.append(c);
          setTimeout(() => c.isConnected && !c.classList.contains('got') && c.remove(), 1900);
        };
        spawn();
        const timer = setInterval(spawn, 650);
      });
      return box;
    },

    // Финал: сложить слово из собранных кристаллов и зажать кнопку пуска.
    word(task, done) {
      const box = document.createElement('div');
      box.className = 'word';
      const target = document.createElement('div');
      target.className = 'word-target';
      const slots = [...task.word].map(() => target.appendChild(Object.assign(document.createElement('span'), { className: 'crystal-slot' })));
      const pool = document.createElement('div');
      pool.className = 'word-pool';
      let built = '';
      const letters = shuffle(state.letters).map((ch) => {
        const b = button(ch, 'crystal-btn');
        b.addEventListener('click', () => {
          if (b.disabled) return;
          sound.tap();
          b.disabled = true;
          slots[built.length].textContent = ch;
          slots[built.length].classList.add('filled');
          built += ch;
          if (built.length === task.word.length) {
            if (built === task.word) {
              setTimeout(() => launchButton(box, done), 300);
            } else {
              sound.wrong();
              shake(target);
              toast('Двигатели не отвечают. Попробуй другой порядок');
              setTimeout(() => {
                built = '';
                slots.forEach((s) => { s.textContent = ''; s.classList.remove('filled'); });
                letters.forEach((x) => (x.disabled = false));
              }, 500);
            }
          }
        });
        return b;
      });
      pool.append(...letters);
      box.append(target, pool);
      return box;
    },
  };

  function launchButton(box, done) {
    sound.success();
    $('panel-title').textContent = 'Двигатели готовы!';
    $('panel-text').textContent = 'Зажми кнопку и держи, пока шкала не заполнится.';
    say('Слово принято. Двигатели готовы. Зажми кнопку пуска!');
    const hold = document.createElement('button');
    hold.className = 'hold-btn';
    hold.innerHTML = '<span class="hold-fill"></span><span class="hold-label">ПУСК</span>';
    const fillEl = hold.querySelector('.hold-fill');
    let start = 0, raf = 0;
    const HOLD_MS = 1500;
    const step = (t) => {
      const p = Math.min(1, (t - start) / HOLD_MS);
      fillEl.style.transform = `scaleX(${p})`;
      if (p >= 1) {
        hold.disabled = true;
        return done();
      }
      raf = requestAnimationFrame(step);
    };
    const down = (e) => {
      e.preventDefault();
      if (hold.disabled) return;
      sound.beep();
      start = performance.now();
      raf = requestAnimationFrame(step);
    };
    const up = () => {
      if (hold.disabled) return;
      cancelAnimationFrame(raf);
      fillEl.style.transform = 'scaleX(0)';
    };
    hold.addEventListener('pointerdown', down);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, up));
    box.replaceChildren(hold);
  }

  function openTask(station) {
    openPanel(station);
    const render = TASKS[station.task.type];
    $('panel-body').replaceChildren(render(station.task, () => completeStation(station)));
  }

  // ---------- Награда и переходы ----------
  function completeStation(station) {
    $('toast').hidden = true;
    if (station.task.type === 'word') return launch();
    sound.success();
    const rect = $('panel').getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + 40, 18);
    setTimeout(() => {
      closePanel();
      state.letters.push(station.letter);
      state.phase = 'reward';
      renderHud();
      $('reward-letter').textContent = station.letter;
      $('reward-title').textContent = `Кристалл «${station.letter}» получен!`;
      $('reward-fact').textContent = station.fact;
      $('reward').hidden = false;
      say(`Кристалл получен! ${station.fact}`);
    }, 600);
  }

  $('reward-btn').addEventListener('click', () => {
    sound.tap();
    $('reward').hidden = true;
    state.current++;
    enterSearch();
    say(stations[state.current].search);
  });

  function launch() {
    closePanel();
    state.phase = 'launch';
    renderHud();
    const seq = ['3', '2', '1', 'Поехали!'];
    $('countdown').hidden = false;
    seq.forEach((n, i) =>
      setTimeout(() => {
        $('countdown-num').textContent = n;
        $('countdown-num').classList.remove('pop');
        $('countdown-num').getBoundingClientRect();
        $('countdown-num').classList.add('pop');
        if (i < 3) { sound.beep(); say(n); } else { say('Поехали!'); sound.launch(); liftOff(); }
      }, i * 1000),
    );
  }

  function liftOff() {
    document.body.classList.add('quake');
    $('flame')?.setAttribute('scale', '1.8 2.6 1.8');
    $('rocket')?.setAttribute('animation__lift', { property: 'position', to: '0 9 0', dur: 3000, easing: 'easeInQuad' });
    setTimeout(() => {
      document.body.classList.remove('quake');
      $('countdown').hidden = true;
      finish();
    }, 3200);
  }

  function finish() {
    state.phase = 'done';
    const secs = Math.round((Date.now() - state.startedAt) / 1000);
    $('cert-number').textContent = `№ ${String(Math.floor(1000 + Math.random() * 9000))}`;
    $('cert-name').textContent = `Капитан ${state.name}`;
    $('cert-mission').textContent = `Миссия «${Q.title}» выполнена`;
    $('cert-time').textContent = `${Math.floor(secs / 60)} мин ${String(secs % 60).padStart(2, '0')} с`;
    $('cert-stations').textContent = `${stations.length} из ${stations.length}`;
    $('cert-date').textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    $('cert-text').textContent = fill(Q.finale);
    showScreen('screen-final');
    stars.warp(true);
    setTimeout(() => stars.warp(false), 2500);
    say(fill(Q.finale));
    setTimeout(() => {
      const r = document.querySelector('.certificate').getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + 30, 24);
    }, 400);
  }

  // ---------- Старт и брифинг ----------
  $('start-title').textContent = Q.title;
  $('start-planets').innerHTML = stations.map((s) => icon(s.id)).join('');
  $('cert-stars').innerHTML = stations.map(() => icon('star')).join('');
  window.ICONS.fill();
  $('hud-ship').textContent = Q.ship;
  $('name-input').value = params.get('name') || '';

  $('start-btn').addEventListener('click', () => {
    window.FX.unlock();
    sound.tap();
    state.name = $('name-input').value.trim() || 'Звёздный';
    showScreen('screen-brief');
    stars.warp(true);
    setTimeout(() => stars.warp(false), 1200);
    typeBriefing();
  });

  function typeBriefing() {
    const text = Q.briefing.map(fill).join('\n\n');
    const out = $('brief-text');
    out.textContent = '';
    say(text);
    let i = 0;
    const timer = setInterval(() => {
      out.textContent = text.slice(0, ++i);
      if (i % 3 === 0) sound.tap();
      if (i >= text.length) {
        clearInterval(timer);
        $('brief-btn').disabled = false;
      }
    }, 22);
    // Нажатие на текст — показать сразу целиком.
    out.parentElement.onclick = () => { i = text.length - 1; };
  }

  $('brief-btn').addEventListener('click', () => {
    sound.tap();
    state.startedAt = Date.now();
    showScreen(null);
    enterSearch();
    say(stations[0].search);
    if (!state.camera && !DEMO) waitForCamera();
  });

  // ---------- Камера ----------
  let cameraTimer;
  function waitForCamera() {
    $('cam-loading').hidden = false;
    cameraTimer = setTimeout(() => {
      $('cam-loading-text').textContent = 'Камера не включается. Проверьте, что браузеру разрешён доступ к камере, и перезагрузите страницу.';
    }, 8000);
  }
  function onCameraReady() {
    state.camera = true;
    clearTimeout(cameraTimer);
    const wasWaiting = !$('cam-loading').hidden;
    $('cam-loading').hidden = true;
    renderHud();
    if (wasWaiting || state.phase === 'search') toast('Камера включена ✓ Наведи планшет на метку', 3500);
  }
  window.addEventListener('arjs-video-loaded', () => !state.camera && onCameraReady());
  // Событие могло прийти раньше, чем подписались: проверяем само видео.
  const videoPoll = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.readyState >= 2 && v.videoWidth) {
      clearInterval(videoPoll);
      if (!state.camera) onCameraReady();
    }
  }, 500);

  $('restart-btn').addEventListener('click', () => location.reload());

  $('sound-btn').addEventListener('click', () => {
    window.FX.setMuted(!window.FX.isMuted());
    renderHud();
  });

  // ---------- AR-события ----------
  stations.forEach((s, i) => {
    const m = $(`marker-${s.id}`);
    m?.addEventListener('markerFound', () => onMarkerFound(i));
    m?.addEventListener('markerLost', () => onMarkerLost(i));
  });

  // Код для табло на Марсе берём из данных квеста.
  const codeTask = stations.find((s) => s.task.type === 'code');
  if (codeTask) $('mars-holo')?.setAttribute('hologram', 'text', codeTask.task.code);

  window.addEventListener('camera-error', () => {
    if (DEMO) return;
    clearTimeout(cameraTimer);
    $('cam-loading').hidden = true;
    showScreen('screen-camera');
  });

  // ?demo — кнопка вместо метки, чтобы пройти квест без камеры и распечатки.
  $('demo-btn').addEventListener('click', () => {
    onMarkerFound(state.current);
    visible.delete(state.current); // в демо «метка» сразу уходит из кадра
  });

  showScreen('screen-start');
})();
