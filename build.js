#!/usr/bin/env node
/* ============================================================================
   SPRINT — build i thjeshtë, pa varësi.
   Zëvendëson shënjuesit  <!--INCLUDE:shared/data.js-->  me përmbajtjen e vërtetë,
   duke prodhuar faqe krejtësisht të pavarura (një skedar i vetëm secila).

   Del në dist/:
     index.html          faqja zyrtare
     admin/index.html    paneli i menaxhimit
     mockups/            të pesë drejtimet + faqja e zgjedhjes
     artifact/           të njëjtat, pa <html>/<head>/<body>, për publikim
     assets/             fotot dhe logoja, nëse ekzistojnë

   Përdorimi:  node build.js
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'dist');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const INCLUDE = /<!--\s*INCLUDE:([^\s>]+?)\s*-->/g;

function inline(html, depth = 0) {
  if (depth > 6) throw new Error('INCLUDE i thelluar shumë (cikël?)');
  return html.replace(INCLUDE, (_, rel) => {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) throw new Error('Mungon skedari i përfshirë: ' + rel);
    const body = fs.readFileSync(file, 'utf8');
    if (rel.endsWith('.js')) return '<script>\n' + inline(body, depth + 1) + '\n</script>';
    if (rel.endsWith('.css')) return '<style>\n' + body + '\n</style>';
    return inline(body, depth + 1);
  });
}

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';

function emit(srcPath, outPath) {
  const out = inline(fs.readFileSync(srcPath, 'utf8'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out);
  console.log('  ✓ ' + path.relative(root, outPath).replace(/\\/g, '/') + '  (' + kb(out) + ')');
  return out;
}

/* ── faqja zyrtare dhe paneli ── */
emit(path.join(root, 'src', 'site.html'), path.join(outDir, 'index.html'));
emit(path.join(root, 'src', 'admin.html'), path.join(outDir, 'admin', 'index.html'));

/* ── mockup-et (ruhen si referencë) ── */
const mockDir = path.join(outDir, 'mockups');
const mocks = fs.readdirSync(path.join(root, 'mockups')).filter((f) => f.endsWith('.html'));
const built = {};
for (const f of mocks) {
  const name = f === '_index.html' ? 'index.html' : f;
  built[f] = emit(path.join(root, 'mockups', f), path.join(mockDir, name));
}

/* --------------------------------------------------------------------------
   Variantet për publikim si Artifact.
   Platforma e publikimit e mbështjell vetë skedarin me <!doctype>/<head>/<body>,
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
for (const f of mocks) {
  if (f === '_index.html') continue;          // faqja e zgjedhjes ka variantin e vet
  fs.writeFileSync(path.join(artDir, f), toArtifact(built[f]));
}
// faqja zyrtare edhe si artifact, për ta parë pa e publikuar në domain
fs.writeFileSync(path.join(artDir, 'site.html'),
  toArtifact(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')));
// faqja e zgjedhjes për publikim (lidhje drejt URL-ve, pa iframe)
const artIdx = path.join(root, 'src', 'artifact-index.html');
if (fs.existsSync(artIdx)) fs.copyFileSync(artIdx, path.join(artDir, 'index.html'));
console.log('  ✓ dist/artifact/  (variantet për publikim)');

/* ── skedarët e vegjël të rrënjës ── */
fs.writeFileSync(path.join(outDir, 'robots.txt'),
  'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /mockups/\n');
console.log('  ✓ dist/robots.txt');

/* ── fotot dhe logoja ── */
const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) {
  fs.cpSync(assets, path.join(outDir, 'assets'), { recursive: true });
  console.log('  ✓ dist/assets/');
}

console.log('\nGati.\n');
