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


/* --------------------------------------------------------------------------
   Variantet për publikim si Artifact.
   Platforma e Artifact-eve e mbështjell vetë skedarin me <!doctype>/<head>/<body>,
   ndaj këtu heqim mbështjellësin tonë dhe lëmë <title>, fontet, <style> e trupin.
   -------------------------------------------------------------------------- */
function toArtifact(html) {
  const title = (html.match(/<title>[\s\S]*?<\/title>/i) || [''])[0];
  const links = (html.match(/<link[^>]*>/gi) || [])
    .filter((l) => /fonts\.(googleapis|gstatic)\.com/.test(l)).join('\n');
  const noscript = (html.match(/<noscript>[\s\S]*?<\/noscript>/i) || [''])[0];
  const styles = (html.match(/<style>[\s\S]*?<\/style>/gi) || []).join('\n');
  const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [, ''])[1];
  return [title, links, noscript, styles, body].filter(Boolean).join('\n');
}

const artDir = path.join(outDir, 'artifact');
fs.mkdirSync(artDir, { recursive: true });
for (const f of files) {
  if (f === '_index.html') continue;   // faqja e zgjedhjes ka variantin e vet
  const src = fs.readFileSync(path.join(root, 'mockups', f), 'utf8');
  fs.writeFileSync(path.join(artDir, f), toArtifact(inline(src, path.join(root, 'mockups'))));
}
// faqja e zgjedhjes për publikim (lidhje drejt 5 URL-ve, pa iframe)
const artIdx = path.join(root, 'src', 'artifact-index.html');
if (fs.existsSync(artIdx)) fs.copyFileSync(artIdx, path.join(artDir, 'index.html'));
console.log('  ✓ dist/artifact/  (variantet për publikim)');

// kopjo assets nëse ekzistojnë foto reale
const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) {
  fs.cpSync(assets, path.join(outDir, 'assets'), { recursive: true });
  console.log('  ✓ dist/assets/');
}

console.log(`\nU ndërtuan ${n} faqe në dist/\n`);
