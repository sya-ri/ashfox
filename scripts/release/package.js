'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { isStrictSemVer } = require('./validate');
const { cliIdentity } = require('./identity');
const { buildCli } = require('../../apps/cli/build');

const runNpm = (args, options = {}) => {
  const npmCli = process.env.npm_execpath;
  if (npmCli && path.basename(npmCli) === 'npm-cli.js') {
    return execFileSync(process.execPath, [npmCli, ...args], options);
  }
  if (process.platform === 'win32') {
    return execFileSync(process.execPath, [path.join(path.dirname(process.execPath),
      'node_modules/npm/bin/npm-cli.js'), ...args], options);
  }
  return execFileSync('npm', args, options);
};

const packageCli = (root, out, fork = false) => {
  const identity = cliIdentity(fork);
  const { version, engines } = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  if (!isStrictSemVer(version)) throw new Error('Invalid product version');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'ashfox-package-'));
  try {
    const executable = buildCli(root, fork);
    fs.mkdirSync(path.join(stage, 'dist'));
    for (const [source, target] of [
      [path.relative(root, executable), 'dist/ashfox.cjs'],
      [identity.readme, 'README.md'], ['LICENSE', 'LICENSE']
    ]) fs.copyFileSync(path.join(root, source), path.join(stage, target));
    fs.chmodSync(path.join(stage, 'dist/ashfox.cjs'), 0o755);
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
      name: identity.name, version, description: 'Assets as Code for voxel games',
      license: 'MIT', engines, bin: { [identity.command]: 'dist/ashfox.cjs' },
      files: ['dist/ashfox.cjs', 'README.md', 'LICENSE'],
      repository: { type: 'git', url: identity.repository }
    }, null, 2) + '\n');
    fs.mkdirSync(out, { recursive: true });
    const result = JSON.parse(runNpm(['pack', '--ignore-scripts', '--json'], {
      cwd: stage, encoding: 'utf8'
    }));
    const archive = path.join(out, identity.archive);
    fs.copyFileSync(path.join(stage, result[0].filename), archive);
    return archive;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
};
module.exports = { packageCli, runNpm };
