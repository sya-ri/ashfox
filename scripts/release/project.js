'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { starterFiles } = require('./starter');
const { cliIdentity } = require('./identity');
const projectFiles = (root, fork = false) => {
  const files = {};
  for (const [name, source] of Object.entries(starterFiles(root))) {
    if (name === 'marker.ashfox') continue;
    const group = ['sword.ashfox', 'shared.ashfox'].includes(name) ? 'items' : name === 'claw_hit.ashfox' ? 'sounds' : 'creatures/fox';
    files[`asset/${group}/${name}`] = source;
  }
  for (const name of ['.ashfoxworkspace.mjs', 'assets.mjs', 'README.md', '.gitignore']) {
    files[name] = fs.readFileSync(path.join(root, 'scripts/release/project', name), 'utf8');
  }
  if (fork) {
    const identity = cliIdentity(true);
    files['README.md'] = files['README.md']
      .replace('https://ashfox.io/docs/guides/install/', identity.guide)
      .replace('Install and lock the Ashfox CLI at this project root following',
        'Install the global sya-ri-ashfox CLI following')
      .replace('Commit the package and lock files.', 'Updates are shared by all projects on this computer.')
      .replaceAll('npx --no-install ashfox', identity.command);
    const globalCli = [
      '',
      'const globalCli = () => {',
      '  const configured = process.env.npm_execpath;',
      "  const npmCli = configured && path.basename(configured) === 'npm-cli.js' ? configured",
      "    : process.platform === 'win32' ? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js') : undefined;",
      "  const result = spawnSync(npmCli ? process.execPath : 'npm', npmCli ? [npmCli, 'root', '--global'] : ['root', '--global'], {",
      "    encoding: 'utf8', timeout: 30000",
      '  });',
      "  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);",
      "  return path.join(result.stdout.trim(), 'sya-ri-ashfox/dist/ashfox.cjs');",
      '};'
    ].join('\n');
    files['assets.mjs'] = files['assets.mjs']
      .replace("const root = path.dirname(fileURLToPath(import.meta.url));",
        "const root = path.dirname(fileURLToPath(import.meta.url));" + globalCli)
      .replace("path.join(root, 'node_modules/@ashfox/cli/dist/ashfox.cjs')", 'globalCli()')
      .replace("// One adapter for the project's pinned CLI; no download during a game build.",
        '// One adapter for the global fork CLI; updates apply across projects.')
      .replace('// The game build consumes this response directly; there is no stale global alias.',
        '// The game build consumes the global CLI response directly.');
  }
  return files;
};
module.exports = { projectFiles };
