'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { packageCli, runNpm } = require('./package');
const { dataDirectory, readSource, isForkCheckout, selectSource, rememberSource, installFork } = require('./fork');

const root = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'ashfox-fork-'));
const prefix = path.join(temp, 'global prefix');
const config = path.join(temp, 'user data/config.json');
const fixture = path.join(temp, 'fork source with spaces');
const variables = ['npm_config_prefix', 'npm_config_cache', 'npm_config_offline'];
const saved = variables.map(key => process.env[key]);
const savedPath = process.env.PATH;
process.env.npm_config_prefix = prefix;
process.env.npm_config_cache = path.join(temp, 'cache');
process.env.npm_config_offline = 'true';
const execute = (file, args = [], cwd = temp) => execFileSync(process.execPath, [file, ...args], {
  cwd, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe']
});
const binDirectory = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
const official = path.join(prefix, process.platform === 'win32' ? 'node_modules' : 'lib/node_modules', '@ashfox/cli');
const fork = path.join(path.dirname(path.dirname(official)), 'sya-ri-ashfox');

try {
  assert.equal(dataDirectory('win32', { LOCALAPPDATA: temp }, temp), path.join(temp, 'sya-ri-ashfox'));
  assert.equal(dataDirectory('darwin', {}, temp), path.join(temp, 'Library/Application Support/sya-ri-ashfox'));
  assert.equal(dataDirectory('linux', {}, temp), path.join(temp, '.local/share/sya-ri-ashfox'));
  assert.equal(dataDirectory('linux', { XDG_DATA_HOME: temp }, temp), path.join(temp, 'sya-ri-ashfox'));
  assert.throws(() => dataDirectory('linux', { XDG_DATA_HOME: 'relative' }, temp), /absolute/);
  assert.equal(readSource(config), undefined);
  assert.equal(selectSource(undefined, config, root, temp), root);
  assert.equal(selectSource(undefined, config, temp, temp), path.join(temp, 'source'));
  rememberSource(config, fixture);
  assert.equal(selectSource(undefined, config, root, temp), fixture);
  assert.equal(selectSource(root, config, temp, temp), root);
  assert.throws(() => selectSource('relative', config, root, temp), /absolute/);
  for (const invalid of [null, [], {}, { sourceDirectory: 'relative' }, { sourceDirectory: root, extra: true }]) {
    fs.writeFileSync(config, JSON.stringify(invalid));
    assert.throws(() => readSource(config), /Invalid fork config/);
    assert.equal(selectSource(root, config, temp, temp), root);
  }
  rememberSource(config, root);
  assert.equal(isForkCheckout(path.join(root, 'apps')), false);
  assert.throws(() => installFork(temp, config), /root of a sya-ri\/ashfox checkout/);
  assert.equal(readSource(config), root);

  fs.mkdirSync(fixture);
  for (const name of ['package.json', 'LICENSE', 'apps/cli', 'packages', 'scripts/release', 'scripts/quality', 'docs/fork-agent.md']) {
    fs.cpSync(path.join(root, name), path.join(fixture, name), {
      recursive: true, filter: file => !['dist', 'node_modules', 'tests'].includes(path.basename(file))
    });
  }
  for (const name of ['examples/fox/creatures', 'examples/items/src', 'examples/sounds/src', 'examples/minecraft/marker.ashfox']) {
    fs.cpSync(path.join(root, name), path.join(fixture, name), { recursive: true });
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  execFileSync('git', ['init', '--quiet'], { cwd: fixture });
  execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/sya-ri/ashfox.git'], { cwd: fixture });
  assert.equal(isForkCheckout(fixture), true, JSON.stringify({
    fixture,
    root: execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: fixture, encoding: 'utf8' }).trim(),
    origin: execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: fixture, encoding: 'utf8' }).trim()
  }));
  if (process.platform === 'win32') {
    assert.equal(isForkCheckout(fixture.toLowerCase()), true, 'Windows checkout paths ignore case');
  }
  execFileSync('git', ['remote', 'set-url', 'origin', 'https://github.com/sigee-min/ashfox.git'], { cwd: fixture });
  assert.equal(isForkCheckout(fixture), false);
  execFileSync('git', ['remote', 'set-url', 'origin', 'git@github.com:sya-ri/ashfox.git'], { cwd: fixture });

  const officialArchive = packageCli(root, path.join(temp, 'archives'));
  runNpm(['install', '--global', '--ignore-scripts', '--no-audit', '--no-fund', officialArchive], { cwd: temp, stdio: 'pipe' });
  const officialBytes = fs.readFileSync(path.join(official, 'dist/ashfox.cjs'));
  const officialShim = fs.readFileSync(path.join(binDirectory, process.platform === 'win32' ? 'ashfox.cmd' : 'ashfox'));
  fs.mkdirSync(binDirectory, { recursive: true });
  const collision = path.join(binDirectory, process.platform === 'win32' ? 'sya-ri-ashfox.cmd' : 'sya-ri-ashfox');
  fs.writeFileSync(collision, 'preserve unrelated command');
  assert.throws(() => installFork(fixture, config));
  assert.equal(fs.readFileSync(collision, 'utf8'), 'preserve unrelated command');
  assert.equal(readSource(config), root, 'failed installation preserves saved source');
  fs.unlinkSync(collision);

  const installed = installFork(fixture, config);
  assert.equal(installed, path.join(fork, 'dist/ashfox.cjs'));
  assert.equal(readSource(config), fs.realpathSync(fixture));
  assert.equal(execute(installed, ['--version']).trim(), require('../../package.json').version);
  const metadata = JSON.parse(fs.readFileSync(path.join(fork, 'package.json')));
  assert.equal(metadata.name, 'sya-ri-ashfox');
  assert.deepEqual(metadata.bin, { 'sya-ri-ashfox': 'dist/ashfox.cjs' });
  assert.equal(metadata.dependencies, undefined);
  assert.equal(metadata.scripts, undefined);
  assert.match(execute(installed, ['--help']), /sya-ri-ashfox init/);
  assert.match(JSON.parse(execute(installed, ['capabilities'])).result.usage, /^sya-ri-ashfox /);
  assert.equal(JSON.parse(execute(installed, ['doctor', '--json'])).ok, true);
  assert.match(execute(path.join(official, 'dist/ashfox.cjs'), ['--help']), /  ashfox init/);

  process.env.PATH = binDirectory + path.delimiter + process.env.PATH;
  execute(installed, ['init', 'first asset project']);
  execute(installed, ['init', 'second asset project']);
  const first = path.join(temp, 'first asset project');
  const second = path.join(temp, 'second asset project');
  const adapter = fs.readFileSync(path.join(first, 'assets.mjs'), 'utf8');
  assert.ok(!adapter.includes('@ashfox/cli'));
  assert.match(adapter, /sya-ri-ashfox\/dist\/ashfox.cjs/);
  const readme = fs.readFileSync(path.join(first, 'README.md'), 'utf8');
  assert.ok(!readme.includes('npx --no-install ashfox'));
  assert.ok(!readme.includes('https://ashfox.io/docs/guides/install/'));
  for (const [source, output, magic] of [
    ['asset/items/sword.ashfox', 'sword.png', '\x89PNG'],
    ['asset/creatures/fox/fox.ashfox', 'fox.glb', 'glTF'],
    ['asset/sounds/claw_hit.ashfox', 'claw.wav', 'RIFF']
  ]) {
    execute(installed, ['export', source, '--output', output], first);
    assert.equal(fs.readFileSync(path.join(first, output)).subarray(0, 4).toString('latin1'), magic);
  }
  const built = JSON.parse(execute(path.join(first, 'assets.mjs')));
  assert.ok(built.bundleHash);
  assert.ok(JSON.parse(execute(path.join(second, 'assets.mjs'))).bundleHash);
  assert.throws(() => execute(installed, ['export', 'asset/items/sword.ashfox', '--output', 'sword.png'], first));
  const customSource = path.join(fixture, 'apps/cli/src/onboarding/cli.ts');
  fs.writeFileSync(customSource, fs.readFileSync(customSource, 'utf8').replace('game assets from code', 'customized assets from code'));
  installFork(fixture, config);
  assert.match(execute(installed, ['--help'], first), /customized assets from code/);
  assert.match(execute(installed, ['--help'], second), /customized assets from code/);
  assert.ok(JSON.parse(execute(path.join(first, 'assets.mjs'))).bundleHash);
  assert.deepEqual(fs.readFileSync(path.join(official, 'dist/ashfox.cjs')), officialBytes);
  assert.deepEqual(fs.readFileSync(path.join(binDirectory, process.platform === 'win32' ? 'ashfox.cmd' : 'ashfox')), officialShim);

  const guide = fs.readFileSync(path.join(root, 'docs/fork-agent.md'), 'utf8');
  const readmeRoot = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(readmeRoot.includes('https://raw.githubusercontent.com/sya-ri/ashfox/main/docs/fork-agent.md'));
  assert.match(guide, /git merge --ff-only origin\/main/);
  assert.match(guide, /Only fetch and/);
  assert.match(guide, /sourceDirectory/);
  console.log('Fork CLI: source selection, spaced checkout, collision preservation, global coexistence, exports, adapters and shared rebuild pass');
} finally {
  if (savedPath === undefined) delete process.env.PATH;
  else process.env.PATH = savedPath;
  variables.forEach((key, index) => {
    if (saved[index] === undefined) delete process.env[key];
    else process.env[key] = saved[index];
  });
  const resolved = fs.realpathSync(temp);
  if (!resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep)) throw new Error('Unsafe test cleanup path');
  fs.rmSync(temp, { recursive: true, force: true });
}
