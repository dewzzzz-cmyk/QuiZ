// Графика интерфейса «Звёздной экспедиции».
// Станции — отрендеренные планеты (space/art/*.png, делает tools/space-art). Служебные значки —
// тонкие линейные глифы в одном стиле (штрих 1.5, как приборы в ЦУПе). Нашивка миссии — SVG.
window.ICONS = (() => {
  const PLANETS = { moon: 'art/planet-moon.png', mars: 'art/planet-mars.png', saturn: 'art/planet-saturn.png', belt: 'art/planet-belt.png' };
  const LINE = {
    launch: '<path d="M12 2.5c2.6 2.2 3.6 5.6 3.6 9v5.2H8.4v-5.2c0-3.4 1-6.8 3.6-9z"/><path d="M8.4 13.5 5.5 17v2.5l2.9-1.6M15.6 13.5l2.9 3.5v2.5l-2.9-1.6"/><circle cx="12" cy="9.5" r="1.6"/><path d="M10.5 19.5c.4 1.2 1 2 1.5 2s1.1-.8 1.5-2"/>',
    soundOn: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    soundOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    camera: '<path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5L9 5h6l1.5 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/><circle cx="12" cy="13" r="3.5"/>',
    antenna: '<path d="M5 17.5a8.5 8.5 0 0 1 11-11z"/><path d="m10.5 12 5-5M12 21l-3.5-6.5M12 21H8m4 0h4"/><path d="M17 3.5a4 4 0 0 1 3.5 3.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    arrow: '<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5"/>',
    signal: '<path d="M4 18V14M9 18V10M14 18V7M19 18V4"/>',
  };

  function line(name, cls = 'glyph') {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE[name]}</svg>`;
  }

  // Значок станции: рендер планеты или (для космодрома) глиф ракеты в круге.
  function station(id, cls = 'station-icon') {
    if (PLANETS[id]) return `<img class="${cls}" src="${PLANETS[id]}" alt="" draggable="false">`;
    return `<span class="${cls} station-glyph">${line(id)}</span>`;
  }

  // Нашивка миссии: планета в круге, орбита, надпись по кругу.
  let n = 0;
  function patch(cls = 'patch') {
    const u = ++n;
    return `<svg class="${cls}" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <clipPath id="pc${u}"><circle cx="100" cy="100" r="62"/></clipPath>
        <path id="pt${u}" d="M100 100m-80 0a80 80 0 1 1 160 0"/>
        <path id="pb${u}" d="M100 100m-86 0a86 86 0 0 0 172 0"/>
      </defs>
      <circle cx="100" cy="100" r="97" fill="#05070c" stroke="rgba(245,165,36,.9)" stroke-width="1.5"/>
      <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(226,232,240,.18)" stroke-width="1"/>
      <circle cx="100" cy="100" r="66" fill="none" stroke="rgba(245,165,36,.55)" stroke-width="1"/>
      <image href="art/planet-mars-patch.png" x="30" y="30" width="140" height="140" clip-path="url(#pc${u})"/>
      <ellipse cx="100" cy="100" rx="82" ry="22" fill="none" stroke="rgba(232,237,243,.55)" stroke-width="1" transform="rotate(-18 100 100)" stroke-dasharray="120 16 300"/>
      <circle cx="171" cy="80" r="2.6" fill="#f5a524"/>
      <text font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="3.2" fill="#e8edf3"><textPath href="#pt${u}" startOffset="50%" text-anchor="middle">ЗВЁЗДНАЯ ЭКСПЕДИЦИЯ</textPath></text>
      <text font-family="IBM Plex Mono, monospace" font-size="9.5" letter-spacing="3" fill="#f5a524"><textPath href="#pb${u}" startOffset="50%" text-anchor="middle">· ЗАРЯ-7 · ЦУП ·</textPath></text>
    </svg>`;
  }

  return {
    line,
    station,
    patch,
    // Подставить значки во все элементы с data-line / data-patch.
    fill(root = document) {
      root.querySelectorAll('[data-line]').forEach((el) => (el.innerHTML = line(el.dataset.line)));
      root.querySelectorAll('[data-patch]').forEach((el) => (el.innerHTML = patch()));
    },
  };
})();
