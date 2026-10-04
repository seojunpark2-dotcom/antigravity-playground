const { build } = require('esbuild');
const { mkdirSync, copyFileSync } = require('node:fs');
async function main() {
  mkdirSync('dist', { recursive: true });
  for (const file of ['index.html', 'auth.css']) copyFileSync(file, 'dist/' + file);
  await build({ entryPoints: ['src/auth.js'], bundle: true, minify: true, outfile: 'dist/auth.js', platform: 'browser', target: ['es2020'], legalComments: 'eof' });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
