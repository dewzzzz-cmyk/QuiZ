// Генерирует маркеры AR.js для трёх сцен: .patt (для распознавания) и .svg (для печати).
// Запуск: node mvp/tools/gen-markers.mjs
//
// Узор каждого маркера — сетка 4×4 (1 = чёрный). Формат .patt повторяет генератор AR.js
// (threex-arpatternfile): 16×16 пикселей, 4 поворота против часовой, каналы B, G, R.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'markers');

const PATTERNS = {
  scene1: [
    [1, 1, 0, 0],
    [0, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 1, 1, 0],
  ],
  scene2: [
    [0, 1, 0, 1],
    [1, 1, 0, 0],
    [0, 0, 1, 0],
    [1, 0, 0, 1],
  ],
  scene3: [
    [1, 1, 1, 0],
    [1, 0, 0, 0],
    [0, 1, 0, 1],
    [1, 1, 1, 0],
  ],
};

const upscale = (grid, size) =>
  Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => grid[Math.floor((y * grid.length) / size)][Math.floor((x * grid.length) / size)]),
  );

// Поворот на 90° против часовой стрелки.
const rotateCCW = (g) => g.map((row, y) => row.map((_, x) => g[x][g.length - 1 - y]));

function toPatt(grid) {
  let px = upscale(grid, 16);
  const blocks = [];
  for (let r = 0; r < 4; r++) {
    const channel = px.map((row) => row.map((v) => String(v ? 0 : 255).padStart(3)).join(' ')).join('\n');
    blocks.push([channel, channel, channel].join('\n'));
    px = rotateCCW(px);
  }
  return blocks.join('\n\n') + '\n';
}

// Маркер: белое поле, чёрная рамка, узор в центре (patternRatio 0.5, как по умолчанию в AR.js).
function toSvg(grid, label) {
  const cell = 10; // 4 клетки узора = 40, рамка = 20 с каждой стороны, поле = 10
  const margin = 10, border = 20, inner = grid.length * cell;
  const size = margin * 2 + border * 2 + inner;
  const rects = [];
  grid.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) rects.push(`<rect x="${margin + border + x * cell}" y="${margin + border + y * cell}" width="${cell}" height="${cell}"/>`);
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 14}" width="${size * 2}mm" height="${(size + 14) * 2}mm" shape-rendering="crispEdges">
<rect width="${size}" height="${size + 14}" fill="#fff"/>
<rect x="${margin}" y="${margin}" width="${inner + border * 2}" height="${inner + border * 2}"/>
<rect x="${margin + border}" y="${margin + border}" width="${inner}" height="${inner}" fill="#fff"/>
${rects.join('\n')}
<text x="${size / 2}" y="${size + 8}" font-family="sans-serif" font-size="7" text-anchor="middle">${label}</text>
</svg>
`;
}

// Узоры должны различаться при любых поворотах, иначе AR.js перепутает сцены
// (узоры выше подобраны перебором: между разными маркерами не меньше 8 отличий из 16).
function checkDistinct() {
  const all = [];
  for (const [name, grid] of Object.entries(PATTERNS)) {
    let g = grid;
    for (let r = 0; r < 4; r++) {
      all.push({ name, r, key: g.flat().join('') });
      g = rotateCCW(g);
    }
  }
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      const dist = [...a.key].filter((c, k) => c !== b.key[k]).length;
      if (dist < 4) throw new Error(`Узоры слишком похожи: ${a.name}@${a.r * 90}° и ${b.name}@${b.r * 90}° (отличий: ${dist})`);
    }
}

checkDistinct();
const labels = { scene1: 'QuestAR · Сцена 1 · Карта', scene2: 'QuestAR · Сцена 2 · Компас', scene3: 'QuestAR · Сцена 3 · Сундук' };
for (const [name, grid] of Object.entries(PATTERNS)) {
  writeFileSync(join(OUT, `${name}.patt`), toPatt(grid));
  writeFileSync(join(OUT, `${name}.svg`), toSvg(grid, labels[name]));
}
console.log('Маркеры сгенерированы в', OUT);
