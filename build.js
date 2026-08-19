#!/usr/bin/env node
/* ============================================================================
   SPRINT — build i thjeshtë, pa varësi.
   Merr çdo skedar nga mockups/ dhe zëvendëson shënjuesit
     <!--INCLUDE:shared/data.js-->
   me përmbajtjen e skedarit brenda një <script>, duke prodhuar faqe
   krejtësisht të pavarura (një skedar i vetëm) në dist/.
   Përdorimi:  node build.js
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'dist');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const INCLUDE = /<!--\s*INCLUDE:([^\s>]+?)\s*-->/g;

function inline(html, fromDir, depth = 0) {
  if (depth > 5) throw new Error('INCLUDE i thelluar shumë (cikël?)');
  return html.replace(INCLUDE, (_, rel) => {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) throw new Error('Mungon skedari i përfshirë: ' + rel);
    const body = fs.readFileSync(file, 'utf8');
    if (rel.endsWith('.js')) return '<script>\n' + inline(body, fromDir, depth + 1) + '\n</script>';
    if (rel.endsWith('.css')) return '<style>\n' + body + '\n</style>';
    return inline(body, fromDir, depth + 1);
  });
}

const files = fs.readdirSync(path.join(root, 'mockups')).filter((f) => f.endsWith('.html'));
let n = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(root, 'mockups', f), 'utf8');
  const out = inline(src, path.join(root, 'mockups'));
  const name = f === '_index.html' ? 'index.html' : f;
  fs.writeFileSync(path.join(outDir, name), out);
  const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
  console.log(`  ✓ dist/${name}  (${kb} KB)`);
  n++;
}

// kopjo assets nëse ekzistojnë foto reale
const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) {
  fs.cpSync(assets, path.join(outDir, 'assets'), { recursive: true });
  console.log('  ✓ dist/assets/');
}

console.log(`\nU ndërtuan ${n} faqe në dist/\n`);
