'use strict';
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const { cliIdentity } = require('../../scripts/release/identity');
const { projectFiles } = require('../../scripts/release/project');

const buildCli = (root = path.resolve(__dirname, '../..'), fork = false) => {
  const identity = cliIdentity(fork);
  const browser = esbuild.buildSync({
    entryPoints: [path.join(root, 'packages/render-core/src/observation/browser.ts')],
    bundle: true, platform: 'browser', target: 'es2020', format: 'iife',
    globalName: 'AshfoxObserver', write: false, minify: true
  });
  const outfile = path.join(root, 'apps/cli/dist', identity.command + '.cjs');
  esbuild.buildSync({
    entryPoints: [path.join(root, 'apps/cli/src/main.ts')],
    outfile,
    bundle: true, platform: 'node', target: 'node24', format: 'cjs',
    define: {
      ASHFOX_VERSION: JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version),
      ASHFOX_COMMAND: JSON.stringify(identity.command),
      ASHFOX_GUIDE: JSON.stringify(identity.guide),
      ASHFOX_STARTER: JSON.stringify(projectFiles(root, fork)),
      ASHFOX_OBSERVER_BUNDLE: JSON.stringify(browser.outputFiles[0].text)
    },
    banner: { js: '#!/usr/bin/env node' }
  });
  fs.chmodSync(outfile, 0o755);
  return outfile;
};

if (require.main === module) {
  if (process.argv.length !== 2) throw new Error('Usage: node apps/cli/build.js');
  buildCli();
}
module.exports = { buildCli };
