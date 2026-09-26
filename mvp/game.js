(() => {
  const quest = window.QUEST;
  const params = new URLSearchParams(location.search);
  const playerName = params.get('name') || quest.player;
  const $ = (id) => document.getElementById(id);

  let current = 0;
  let phase = 'start'; // start → search → riddle → … → done

  function render() {
    [...$('progress').children].forEach((dot, i) => {
      dot.className = i < current || phase === 'done' ? 'done' : i === current ? 'active' : '';
    });
    $('hint').textContent = phase === 'search' ? quest.scenes[current].search : '';
    $('riddle').hidden = phase !== 'riddle';
    $('start').hidden = phase !== 'start';
    $('finale').hidden = phase !== 'done';
    $('demo-btn').hidden = !params.has('demo') || phase !== 'search';
    quest.scenes.forEach((_, i) => {
      const obj = $(`obj-${i}`);
      if (obj) obj.setAttribute('visible', i < current || (i === current && phase !== 'search'));
    });
  }

  let toastTimer;
  function toast(text) {
    $('toast').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($('toast').hidden = true), 3000);
  }

  function showRiddle() {
    const scene = quest.scenes[current];
    $('riddle-text').textContent = scene.riddle;
    const options = $('riddle-options');
    options.replaceChildren(
      ...scene.options.map((text, i) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.addEventListener('click', () => answer(i, btn));
        return btn;
      }),
    );
    phase = 'riddle';
    render();
  }

  function answer(i, btn) {
    const scene = quest.scenes[current];
    if (i !== scene.answer) {
      btn.classList.add('wrong');
      toast('Не совсем. Подумай ещё!');
      return;
    }
    if (current === quest.scenes.length - 1) {
      $('chest-lid')?.setAttribute('animation', 'property: rotation; to: -110 0 0; dur: 1200; easing: easeOutBack');
      phase = 'finale-pending';
      render();
      setTimeout(() => {
        phase = 'done';
        $('finale-text').textContent = quest.finale.replace('{name}', playerName);
        render();
      }, 1500);
      return;
    }
    toast(scene.success);
    current++;
    phase = 'search';
    render();
  }

  function onMarkerFound(index) {
    if (phase !== 'search') return;
    if (index === current) showRiddle();
    else if (index > current) toast(`Это маркер №${index + 1}. Сначала найди маркер №${current + 1}!`);
  }

  quest.scenes.forEach((_, i) => {
    $(`marker-${i}`)?.addEventListener('markerFound', () => onMarkerFound(i));
  });

  $('start-btn').addEventListener('click', () => {
    phase = 'search';
    render();
  });

  $('restart-btn').addEventListener('click', () => {
    current = 0;
    $('chest-lid')?.removeAttribute('animation');
    $('chest-lid')?.setAttribute('rotation', '0 0 0');
    phase = 'search';
    render();
  });

  // ?demo — кнопка вместо маркера, чтобы пройти квест без камеры и распечатки.
  $('demo-btn').addEventListener('click', () => onMarkerFound(current));

  render();
})();
