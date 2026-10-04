const { build } = require('esbuild');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
async function main() {
  mkdirSync('dist', { recursive: true });
  const result = await build({
    entryPoints: ['./src/auth.js'], bundle: true, minify: true, write: false,
    platform: 'browser', format: 'iife', target: ['es2020'], legalComments: 'eof'
  });
  const css = readFileSync('auth.css', 'utf8');
  // Escape HTML closing tags inside bundled JavaScript before embedding it.
  const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = readFileSync('src/page.html', 'utf8')
    .replace('<!-- AUTH_STYLES -->', () => '<style>' + css + '</style>')
    .replace('<!-- AUTH_SCRIPT -->', () => '<script>' + script + '</script>');
  // Both double-click previews and Vercel use the same standalone artifact.
  writeFileSync('index.html', html);
  writeFileSync('dist/index.html', html);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
