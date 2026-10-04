'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { packageCli, runNpm } = require('./package');

const dataDirectory = (platform = process.platform, env = process.env, home = os.homedir()) => {
  const base = platform === 'win32' ? env.LOCALAPPDATA
    : platform === 'darwin' ? path.join(home, 'Library/Application Support')
      : env.XDG_DATA_HOME || path.join(home, '.local/share');
  if (!base || !path.isAbsolute(base)) throw new Error('The user data directory must be an absolute path');
  return path.join(base, 'sya-ri-ashfox');
};

const readSource = file => {
  if (!fs.existsSync(file)) return undefined;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).length !== 1 || typeof value.sourceDirectory !== 'string' ||
      !path.isAbsolute(value.sourceDirectory)) {
    throw new Error('Invalid fork config: expected only an absolute sourceDirectory');
  }
  return value.sourceDirectory;
};

const isForkCheckout = directory => {
  try {
    const options = { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], options).trim();
    if (path.relative(fs.realpathSync.native(root), fs.realpathSync.native(directory)) !== '') return false;
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], options).trim();
    return /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)sya-ri\/ashfox(?:\.git)?\/?$/.test(remote);
  } catch {
    return false;
  }
};

const selectSource = (explicit, config, cwd, defaultDirectory) => {
  const selected = explicit ?? readSource(config) ??
    (isForkCheckout(cwd) ? cwd : path.join(defaultDirectory, 'source'));
  if (typeof selected !== 'string' || !path.isAbsolute(selected)) {
    throw new Error('Source directory must be an absolute path');
  }
  return path.resolve(selected);
};

const rememberSource = (file, directory) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, JSON.stringify({ sourceDirectory: directory }, null, 2) + '\n', { flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
};

const buildFork = root => packageCli(root, path.join(root, 'dist/fork'), true);

const installFork = (source, config) => {
  if (!isForkCheckout(source)) {
    throw new Error('Source must be the root of a sya-ri/ashfox checkout. Clone into an empty destination first; existing files are not overwritten.');
  }
  execFileSync(process.execPath, [path.join(source, 'scripts/release/fork.js'), 'build'], {
    cwd: source, stdio: 'inherit'
  });
  const archive = path.join(source, 'dist/fork/sya-ri-ashfox-cli.tgz');
  runNpm(['install', '--global', '--ignore-scripts', '--no-audit', '--no-fund', archive], {
    cwd: source, stdio: 'inherit'
  });
  const globalRoot = runNpm(['root', '--global'], { encoding: 'utf8' }).trim();
  const installed = path.join(globalRoot, 'sya-ri-ashfox/dist/ashfox.cjs');
  const expected = fs.readFileSync(path.join(source, 'apps/cli/dist/sya-ri-ashfox.cjs'));
  if (!fs.readFileSync(installed).equals(expected)) throw new Error('Installed CLI differs from the current fork build');
  execFileSync(process.execPath, [installed, '--version'], { stdio: 'inherit' });
  rememberSource(config, fs.realpathSync.native(source));
  return installed;
};

const main = () => {
  const args = process.argv.slice(2);
  if (args[0] === 'build' && args.length === 1) {
    console.log(buildFork(path.resolve(__dirname, '../..')));
    return;
  }
  if (!['install', 'source'].includes(args[0]) ||
      !(args.length === 1 || (args.length === 3 && args[1] === '--source-directory'))) {
    throw new Error('Usage: node scripts/release/fork.js build|install|source [--source-directory <absolute-path>]');
  }
  const data = dataDirectory();
  const config = path.join(data, 'config.json');
  const source = selectSource(args[2], config, process.cwd(), data);
  if (args[0] === 'source') console.log(source);
  else {
    const installed = installFork(source, config);
    console.log(`Installed: ${installed}\nSource: ${source}\nConfig: ${config}`);
  }
};

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { dataDirectory, readSource, isForkCheckout, selectSource, rememberSource, buildFork, installFork };
