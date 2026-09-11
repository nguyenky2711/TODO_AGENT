const { packager } = require('@electron/packager');
const path = require('path');

async function build() {
  console.log('🚀 Starting Windows package build with @electron/packager...');
  const rootDir = path.resolve(__dirname, '..');

  const appPaths = await packager({
    dir: rootDir,
    name: 'ProductivityAgent',
    platform: 'win32',
    arch: 'x64',
    out: path.join(rootDir, 'release'),
    overwrite: true,
    prune: true,
    ignore: [
      /^\/src/,
      /^\/\.git/,
      /^\/\.agents/,
      /^\/release/,
      /^\/public/,
      /^\/scripts/,
      /\.md$/,
      /tsconfig.*\.json$/,
      /tailwind\.config\.js$/,
      /postcss\.config\.js$/,
      /vite\.config\.ts$/,
    ],
  });

  console.log('✅ Packaging complete! Output directory:', appPaths);
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
