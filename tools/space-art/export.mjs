// Генерирует текстуры и рендеры планет: node tools/space-art/export.mjs
// Нужен Playwright (npm i -g playwright) — картинки рисуются в браузере на canvas.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
const HERE = dirname(fileURLToPath(import.meta.url));
const SPACE = join(HERE, '..', '..', 'space');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><body></body>');
await page.addScriptTag({ path: join(HERE, 'art.js') });
const files = await page.evaluate(() => {
  const { textures: t, sprites, hero } = window.ART.build();
  const jpg = (c, q = 0.88) => c.toDataURL('image/jpeg', q);
  const png = (c) => c.toDataURL('image/png');
  const out = {
    'textures/moon.jpg': jpg(t.moon.color), 'textures/moon-bump.jpg': jpg(t.moon.height, 0.9),
    'textures/mars.jpg': jpg(t.mars.color), 'textures/mars-bump.jpg': jpg(t.mars.height, 0.9),
    'textures/saturn.jpg': jpg(t.saturn.color), 'textures/saturn-ring.png': png(t.ring.color),
    'textures/rock.jpg': jpg(t.rock.color), 'textures/rock-bump.jpg': jpg(t.rock.height, 0.9),
    'textures/space.png': png(t.space.color),
    'art/hero.jpg': jpg(hero, 0.86),
  };
  for (const [name, c] of Object.entries(sprites)) out[`art/${name}.png`] = png(c);
  return out;
});
await browser.close();
for (const [name, url] of Object.entries(files)) {
  const file = join(SPACE, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log(name);
}
