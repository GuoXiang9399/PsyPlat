const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DIR = 'E:/GitHub/PsyPlat/src-tauri/icons';

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
<rect width="32" height="32" rx="8" fill="#FDEEE8"/>
<path d="M16 25C16 25 8 19.5 8 15.5C8 13 10 11.5 12 11.5C14 11.5 16 13.5 16 13.5C16 13.5 18 11.5 20 11.5C22 11.5 24 13 24 15.5C24 19.5 16 25 16 25Z" fill="#E05A3C"/>
<path d="M16 14L16 7.5" stroke="#8CAF50" stroke-width="1.6" stroke-linecap="round"/>
<path d="M16 11.5C13 11.5 11.5 9.5 11.5 7.5C14 7 16 9 16 11.5Z" fill="#A8C46A"/>
<path d="M16 10.5C19 10.5 20.5 8.5 20.5 6.5C18 6 16 8 16 10.5Z" fill="#8CAF50"/>
</svg>`;

const ROOT = [
  ['32x32.png', 32],
  ['64x64.png', 64],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
  ['icon.png', 512],
  ['Square30x30Logo.png', 30],
  ['Square44x44Logo.png', 44],
  ['Square71x71Logo.png', 71],
  ['Square89x89Logo.png', 89],
  ['Square107x107Logo.png', 107],
  ['Square142x142Logo.png', 142],
  ['Square150x150Logo.png', 150],
  ['Square284x284Logo.png', 284],
  ['Square310x310Logo.png', 310],
  ['StoreLogo.png', 50],
];

const ANDROID_DPI = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const ANDROID_FG = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

function iosSize(filename) {
  const m = filename.match(/AppIcon-([\d.]+)(?:x[\d.]+)?(?:@([\d.]+)x)?(?:-\d)?\.png$/);
  if (!m) return null;
  const base = parseFloat(m[1]);
  const scale = m[2] ? parseFloat(m[2]) : 1;
  return Math.round(base * scale);
}

async function render(relPath, size) {
  const out = path.join(DIR, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(LOGO)).resize(size, size, { fit: 'contain' }).png().toFile(out);
}

(async () => {
  const orig = await sharp(path.join(DIR, 'icon.png')).metadata();
  console.log('original icon.png:', orig.width + 'x' + orig.height);

  let n = 0;
  for (const [name, size] of ROOT) {
    await render(name, size);
    n++;
  }

  for (const [dpi, size] of Object.entries(ANDROID_DPI)) {
    await render(`android/mipmap-${dpi}/ic_launcher.png`, size);
    await render(`android/mipmap-${dpi}/ic_launcher_round.png`, size);
    await render(`android/mipmap-${dpi}/ic_launcher_foreground.png`, ANDROID_FG[dpi]);
    n += 3;
  }

  const iosDir = path.join(DIR, 'ios');
  for (const f of fs.readdirSync(iosDir)) {
    const size = iosSize(f);
    if (!size) { console.log('skip', f); continue; }
    await render(`ios/${f}`, size);
    n++;
  }

  console.log('generated:', n);
})();
