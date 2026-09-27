// Иконки «Звёздной экспедиции» — рисованные SVG вместо эмодзи (эмодзи на разных планшетах
// выглядят по-разному). ICONS.svg(name) возвращает строку <svg>; у каждой копии свои id градиентов.
window.ICONS = (() => {
  let n = 0;
  const DRAW = {
    moon: (u) => `
      <defs>
        <radialGradient id="m${u}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f4f6f9"/><stop offset=".55" stop-color="#b8bec8"/><stop offset="1" stop-color="#6c7380"/></radialGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill="url(#m${u})"/>
      <circle cx="17" cy="19" r="4.5" fill="#8a919c" opacity=".8"/><circle cx="16.3" cy="18.3" r="4.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
      <circle cx="29" cy="28" r="6" fill="#8a919c" opacity=".75"/><circle cx="28.2" cy="27.2" r="6" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1"/>
      <circle cx="30" cy="15" r="2.5" fill="#8a919c" opacity=".8"/><circle cx="19" cy="33" r="2" fill="#8a919c" opacity=".8"/>`,
    mars: (u) => `
      <defs>
        <radialGradient id="r${u}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffb07a"/><stop offset=".5" stop-color="#d9572b"/><stop offset="1" stop-color="#7a2410"/></radialGradient>
        <clipPath id="rc${u}"><circle cx="24" cy="24" r="19"/></clipPath>
      </defs>
      <circle cx="24" cy="24" r="19" fill="url(#r${u})"/>
      <g clip-path="url(#rc${u})">
        <ellipse cx="24" cy="5.5" rx="12" ry="4" fill="#fff" opacity=".9"/>
        <path d="M9 25c6-3 11 2 17-1s9-2 14 0" stroke="#7a2410" stroke-width="2.4" fill="none" opacity=".6" stroke-linecap="round"/>
        <ellipse cx="17" cy="31" rx="5" ry="3" fill="#8f2f14" opacity=".45"/><ellipse cx="31" cy="17" rx="4" ry="2.5" fill="#8f2f14" opacity=".4"/>
      </g>`,
    saturn: (u) => `
      <defs>
        <linearGradient id="s${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e3b4"/><stop offset=".3" stop-color="#d9b77c"/><stop offset=".5" stop-color="#f0dfb6"/><stop offset=".7" stop-color="#c99d62"/><stop offset="1" stop-color="#8f6a3d"/></linearGradient>
        <clipPath id="sc${u}"><rect x="0" y="24" width="48" height="24"/></clipPath>
      </defs>
      <ellipse cx="24" cy="24" rx="22" ry="7" fill="none" stroke="#e6c88a" stroke-width="3" transform="rotate(-18 24 24)" opacity=".85"/>
      <circle cx="24" cy="24" r="13" fill="url(#s${u})"/>
      <g transform="rotate(-18 24 24)"><g clip-path="url(#sc${u})"><ellipse cx="24" cy="24" rx="22" ry="7" fill="none" stroke="#e6c88a" stroke-width="3"/></g></g>
      <ellipse cx="24" cy="24" rx="22" ry="7" fill="none" stroke="#fff4d6" stroke-width="1" transform="rotate(-18 24 24)" stroke-dasharray="34 200" stroke-dashoffset="-40" opacity=".7"/>`,
    belt: (u) => `
      <defs>
        <radialGradient id="b${u}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#b8a48d"/><stop offset="1" stop-color="#4a3e33"/></radialGradient>
        <linearGradient id="bc${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0f2fe"/><stop offset=".45" stop-color="#5ef2ff"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
      </defs>
      <path d="M8 26l5-11 11-3 9 5 3 10-6 9-12 2-8-5z" fill="url(#b${u})"/>
      <circle cx="17" cy="22" r="2.5" fill="#3b3129" opacity=".6"/><circle cx="25" cy="30" r="3.2" fill="#3b3129" opacity=".55"/>
      <circle cx="40" cy="12" r="3.5" fill="#7c6a58"/><circle cx="41" cy="36" r="2.2" fill="#7c6a58"/>
      <path d="M35 20l4 5-4 9-4-9z" fill="url(#bc${u})" stroke="#e0fdff" stroke-width=".6"/>`,
    launch: (u) => `
      <defs>
        <linearGradient id="k${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cbd5e1"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#94a3b8"/></linearGradient>
        <linearGradient id="kf${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ff5d2a" stop-opacity="0"/></linearGradient>
      </defs>
      <path d="M20 36c0 6 4 10 4 10s4-4 4-10z" fill="url(#kf${u})"/>
      <path d="M24 3c6 5 8 13 8 21v10H16V24c0-8 2-16 8-21z" fill="url(#k${u})"/>
      <path d="M24 3c3.5 3 5.5 6.5 6.6 10H17.4C18.5 9.5 20.5 6 24 3z" fill="#ff5d73"/>
      <path d="M16 26l-6 8v4l6-3zM32 26l6 8v4l-6-3z" fill="#ff5d73"/>
      <circle cx="24" cy="20" r="3.6" fill="#5ef2ff" stroke="#1e3a8a" stroke-width="1.4"/>
      <rect x="20" y="34" width="8" height="3" rx="1" fill="#475569"/>`,
    crystal: (u) => `
      <defs><linearGradient id="c${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ede9fe"/><stop offset=".45" stop-color="#a78bfa"/><stop offset="1" stop-color="#4c1d95"/></linearGradient></defs>
      <path d="M24 4l14 12-14 28L10 16z" fill="url(#c${u})"/><path d="M10 16h28M24 4l-6 12 6 28 6-28z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`,
    star: (u) => `
      <defs><linearGradient id="t${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>
      <path d="M24 4l6 13 14 2-10 10 2 14-12-7-12 7 2-14L4 19l14-2z" fill="url(#t${u})" stroke="#fff7d6" stroke-width="1"/>`,
    soundOn: () => `
      <path d="M8 19h7l10-8v26l-10-8H8z" fill="currentColor"/>
      <path d="M31 17c3 4 3 10 0 14M35 12c6 7 6 17 0 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
    soundOff: () => `
      <path d="M8 19h7l10-8v26l-10-8H8z" fill="currentColor"/>
      <path d="M32 19l10 10M42 19L32 29" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
    camera: () => `
      <path d="M6 16a4 4 0 014-4h5l3-4h12l3 4h5a4 4 0 014 4v18a4 4 0 01-4 4H10a4 4 0 01-4-4z" fill="none" stroke="currentColor" stroke-width="3"/>
      <circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="3"/>`,
    antenna: () => `
      <path d="M12 30a14 14 0 0118-18z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
      <path d="M21 21l9-9M24 38l-6-12M24 38h-8M24 38h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M34 8a8 8 0 016 6M36 3a13 13 0 019 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
    logo: (u) => `
      <defs>
        <radialGradient id="l${u}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#a5f3fc"/><stop offset=".45" stop-color="#6366f1"/><stop offset="1" stop-color="#1e1b4b"/></radialGradient>
        <linearGradient id="lo${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5ef2ff" stop-opacity="0"/><stop offset=".5" stop-color="#5ef2ff"/><stop offset="1" stop-color="#a78bfa" stop-opacity=".2"/></linearGradient>
      </defs>
      <circle cx="24" cy="24" r="12" fill="url(#l${u})"/>
      <ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="url(#lo${u})" stroke-width="1.6" transform="rotate(-24 24 24)"/>
      <g transform="translate(35 9) rotate(40) scale(.3) translate(-24 -24)">${''}
        <path d="M24 3c6 5 8 13 8 21v10H16V24c0-8 2-16 8-21z" fill="#fff"/><path d="M16 26l-6 8v4l6-3zM32 26l6 8v4l-6-3z" fill="#ff5d73"/><circle cx="24" cy="20" r="3.6" fill="#5ef2ff"/>
        <path d="M20 36c0 6 4 10 4 10s4-4 4-10z" fill="#ffd166"/>
      </g>
      <circle cx="8" cy="10" r="1" fill="#fff"/><circle cx="41" cy="38" r="1.2" fill="#fff"/><circle cx="6" cy="36" r=".8" fill="#a5f3fc"/>`,
  };
  return {
    svg(name, cls = 'icon') {
      const u = `${name}${++n}`;
      return `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true">${DRAW[name](u)}</svg>`;
    },
    // Подставить иконки во все элементы с data-icon="имя".
    fill(root = document) {
      root.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = this.svg(el.dataset.icon, el.dataset.iconClass || 'icon')));
    },
  };
})();
