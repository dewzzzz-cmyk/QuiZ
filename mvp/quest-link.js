// Квест в ссылке: JSON → UTF-8 → base64url в параметре ?q=. Общий код для игры и сборщика.
window.QuestLink = (() => {
  const SCENES = 3; // по числу маркеров и 3D-сцен в index.html
  const LIMITS = { text: 300, option: 60, options: [2, 4] };

  function encode(quest) {
    const bytes = new TextEncoder().encode(JSON.stringify(quest));
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(param) {
    const bin = atob(param.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  }

  const str = (v, max) => typeof v === 'string' && v.trim() !== '' && v.length <= max;

  // Возвращает список ошибок; пустой список — квест можно играть.
  function validate(q) {
    const errors = [];
    if (!q || typeof q !== 'object') return ['Квест не прочитан'];
    if (!str(q.player, LIMITS.option)) errors.push('Имя игрока: от 1 до 60 символов');
    if (q.title !== undefined && !str(q.title, LIMITS.option)) errors.push('Название: от 1 до 60 символов');
    if (q.intro !== undefined && !str(q.intro, LIMITS.text)) errors.push('Вступление: от 1 до 300 символов');
    if (!Array.isArray(q.scenes) || q.scenes.length !== SCENES) return [...errors, `Нужно ровно ${SCENES} сцены`];
    q.scenes.forEach((s, i) => {
      const n = `Сцена ${i + 1}`;
      if (!str(s.search, LIMITS.text)) errors.push(`${n}: заполните подсказку, где искать маркер`);
      if (!str(s.riddle, LIMITS.text)) errors.push(`${n}: заполните загадку`);
      const opts = Array.isArray(s.options) ? s.options : [];
      if (opts.length < LIMITS.options[0] || opts.length > LIMITS.options[1] || !opts.every((o) => str(o, LIMITS.option)))
        errors.push(`${n}: нужно от 2 до 4 вариантов ответа, каждый до 60 символов`);
      if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= opts.length) errors.push(`${n}: отметьте правильный ответ`);
      if (i < SCENES - 1 && !str(s.success, LIMITS.text)) errors.push(`${n}: заполните текст после верного ответа`);
    });
    if (!str(q.finale, LIMITS.text)) errors.push('Заполните текст финала');
    return errors;
  }

  // Квест из ?q=, если он есть и корректен; иначе null.
  function fromLocation(search = location.search) {
    const q = new URLSearchParams(search).get('q');
    if (!q) return null;
    try {
      const quest = decode(q);
      return validate(quest).length === 0 ? quest : null;
    } catch {
      return null;
    }
  }

  return { SCENES, LIMITS, encode, decode, validate, fromLocation };
})();
