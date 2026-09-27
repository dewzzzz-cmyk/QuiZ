(() => {
  const { SCENES, LIMITS, encode, validate, fromLocation } = window.QuestLink;
  const SCENE_NAMES = ['Сцена 1 · Карта', 'Сцена 2 · Компас', 'Сцена 3 · Сундук'];
  const MAX_OPTIONS = LIMITS.options[1];
  const DRAFT_KEY = 'questar-builder-draft';
  const form = document.getElementById('form');
  const $ = (id) => document.getElementById(id);

  // Карточки сцен из шаблона.
  const sceneCards = Array.from({ length: SCENES }, (_, i) => {
    const card = $('scene-tpl').content.firstElementChild.cloneNode(true);
    card.querySelector('h2').textContent = SCENE_NAMES[i];
    const options = card.querySelector('.options');
    for (let k = 0; k < MAX_OPTIONS; k++) {
      const row = document.createElement('div');
      row.className = 'option';
      row.innerHTML = `<input type="radio" name="answer-${i}" value="${k}" aria-label="Правильный ответ">
        <input data-option maxlength="${LIMITS.option}" placeholder="Вариант ${k + 1}${k >= 2 ? ' (необязательно)' : ''}">`;
      options.append(row);
    }
    if (i === SCENES - 1) card.querySelector('[data-success]').remove();
    $('scenes').append(card);
    return card;
  });

  function fill(quest) {
    for (const key of ['player', 'title', 'intro', 'finale']) form.elements[key].value = quest[key] ?? '';
    quest.scenes.forEach((scene, i) => {
      const card = sceneCards[i];
      for (const field of ['search', 'riddle', 'success']) {
        const el = card.querySelector(`[data-field="${field}"]`);
        if (el) el.value = scene[field] ?? '';
      }
      card.querySelectorAll('[data-option]').forEach((el, k) => (el.value = scene.options[k] ?? ''));
      card.querySelectorAll('input[type=radio]').forEach((el, k) => (el.checked = k === scene.answer));
    });
  }

  function read() {
    const v = (key) => form.elements[key].value.trim();
    return {
      title: v('title'),
      intro: v('intro'),
      player: v('player'),
      finale: v('finale'),
      scenes: sceneCards.map((card, i) => {
        // Пустые варианты выбрасываем, правильный ответ пересчитываем по оставшимся.
        const rows = [...card.querySelectorAll('.option')].map((row) => ({
          text: row.querySelector('[data-option]').value.trim(),
          correct: row.querySelector('input[type=radio]').checked,
        }));
        const filled = rows.filter((r) => r.text);
        const scene = {
          search: card.querySelector('[data-field="search"]').value.trim(),
          riddle: card.querySelector('[data-field="riddle"]').value.trim(),
          options: filled.map((r) => r.text),
          answer: filled.findIndex((r) => r.correct),
        };
        if (i < SCENES - 1) scene.success = card.querySelector('[data-field="success"]').value.trim();
        return scene;
      }),
    };
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(read()));
    } catch {}
  }

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      return draft && Array.isArray(draft.scenes) && draft.scenes.length === SCENES ? draft : null;
    } catch {
      return null;
    }
  }

  form.addEventListener('input', () => {
    saveDraft();
    $('result').hidden = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const quest = read();
    const errors = validate(quest);
    $('errors').hidden = errors.length === 0;
    $('errors').replaceChildren(...errors.map((text) => Object.assign(document.createElement('p'), { textContent: text })));
    if (errors.length) {
      $('result').hidden = true;
      $('errors').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const url = new URL('index.html', location.href);
    url.searchParams.set('q', encode(quest));
    $('link').value = url.href;
    $('open').href = url.href;
    const demo = new URL(url);
    demo.searchParams.set('demo', '');
    $('demo').href = demo.href;
    $('result').hidden = false;
    $('result').scrollIntoView({ behavior: 'smooth' });
  });

  $('copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('link').value);
    } catch {
      $('link').select();
      document.execCommand('copy');
    }
    $('copy').textContent = 'Скопировано ✓';
    setTimeout(() => ($('copy').textContent = 'Скопировать ссылку'), 2000);
  });

  $('reset').addEventListener('click', () => {
    fill(window.QUEST);
    saveDraft();
    $('errors').hidden = true;
    $('result').hidden = true;
  });

  // builder.html?q=… открывает готовый квест для правки.
  fill(fromLocation() || loadDraft() || window.QUEST);
})();
