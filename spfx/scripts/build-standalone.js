/**
 * Builds the local version of the app into dist-standalone/: ONE JavaScript file (classic script,
 * not a module, so index.html also opens by double-click) plus index.html. Nothing is loaded from
 * the internet. Usage: node scripts/build-standalone.js [--watch]
 */
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'dist-standalone');
const seedFile = path.join(root, 'src', 'standalone', 'seed.json');
const watch = process.argv.indexOf('--watch') > -1;

// 1. Sample data, from the same source as the SharePoint sample rows. The SharePoint files it also
//    writes go to a temporary folder and are discarded.
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'itsdm-seed-'));
cp.execFileSync(process.execPath, [path.join(__dirname, 'generate-assets.js')], {
  env: Object.assign({}, process.env, { ITSDM_ASSETS_DIR: scratch, ITSDM_SEED_OUT: seedFile }),
  stdio: 'pipe'
});
fs.rmSync(scratch, { recursive: true, force: true });

// 2. The page.
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(root, 'src', 'standalone', 'index.html'), path.join(outDir, 'index.html'));

// 3. The code.
const options = {
  entryPoints: [path.join(root, 'src', 'standalone', 'main.tsx')],
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  minify: !watch,
  sourcemap: watch,
  outfile: path.join(outDir, 'app.js'),
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  loader: { '.json': 'json' },
  tsconfigRaw: { compilerOptions: { jsx: 'react' } },
  logLevel: 'info'
};

if (watch) {
  esbuild.context(options).then((ctx) => ctx.watch()).catch(() => process.exit(1));
} else {
  esbuild.build(options).then((result) => {
    const size = fs.statSync(options.outfile).size;
    console.log(`dist-standalone/app.js ${(size / 1024).toFixed(0)} KB, ${result.errors.length} errors`);
  }).catch(() => process.exit(1));
}
